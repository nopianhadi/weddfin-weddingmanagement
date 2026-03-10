import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import supabase from '../lib/supabaseClient';

interface RealtimeConfig {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  schema?: string;
}

interface OptimizedRealtimeOptions {
  batchDelay?: number; // Batch updates for this many ms
  maxBatchSize?: number; // Maximum items in a batch
  reconnectDelay?: number; // Delay before reconnecting
  maxReconnectAttempts?: number;
}

export function useOptimizedRealtime<T>(
  config: RealtimeConfig,
  onUpdate: (payload: RealtimePostgresChangesPayload<T>) => void,
  options: OptimizedRealtimeOptions = {}
) {
  const {
    batchDelay = 500,
    maxBatchSize = 10,
    reconnectDelay = 1000,
    maxReconnectAttempts = 5
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const batchRef = useRef<RealtimePostgresChangesPayload<T>[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processBatch = useCallback(() => {
    if (batchRef.current.length > 0) {
      // Process batched updates
      batchRef.current.forEach(payload => onUpdate(payload));
      batchRef.current = [];
    }
    batchTimeoutRef.current = null;
  }, [onUpdate]);

  const addToBatch = useCallback((payload: RealtimePostgresChangesPayload<T>) => {
    batchRef.current.push(payload);

    // Process immediately if batch is full
    if (batchRef.current.length >= maxBatchSize) {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      processBatch();
      return;
    }

    // Schedule batch processing
    if (!batchTimeoutRef.current) {
      batchTimeoutRef.current = setTimeout(processBatch, batchDelay);
    }
  }, [processBatch, maxBatchSize, batchDelay]);

  const connect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`optimized-${config.table}-${Date.now()}`)
      .on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter
        } as any,
        (payload: RealtimePostgresChangesPayload<T>) => {
          addToBatch(payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setReconnectAttempts(0);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          
          // Attempt reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts(prev => prev + 1);
              connect();
            }, reconnectDelay * Math.pow(2, reconnectAttempts)); // Exponential backoff
          }
        }
      });

    channelRef.current = channel;
  }, [config, addToBatch, reconnectAttempts, maxReconnectAttempts, reconnectDelay]);

  useEffect(() => {
    connect();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setReconnectAttempts(0);
    connect();
  }, [disconnect, connect]);

  return {
    isConnected,
    reconnectAttempts,
    disconnect,
    reconnect
  };
}