/**
 * Projects Service dengan Offline Support
 */

import { supabase } from '../lib/supabaseClient';
import { syncManager } from './syncManager';
import { offlineStorage } from './offlineStorage';
import type { Project } from '../types';

const TABLE_NAME = 'projects';
const CACHE_KEY = 'projects_list';
const CACHE_TTL_MINUTES = 30;

export async function listProjectsOffline(): Promise<Project[]> {
  try {
    if (!navigator.onLine) {
      console.log('[ProjectsOffline] Offline, returning empty list');
      return [];
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    await offlineStorage.cacheData(CACHE_KEY, data, CACHE_TTL_MINUTES);
    return data || [];
  } catch (error) {
    console.error('[ProjectsOffline] Error fetching projects:', error);
    if (!navigator.onLine) return [];
    const cached = await offlineStorage.getCachedData<Project[]>(CACHE_KEY);
    return cached || [];
  }
}

export async function createProjectOffline(project: Omit<Project, 'id' | 'created_at'>): Promise<Project> {
  const newProject: Project = {
    ...project,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  } as Project;

  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert(newProject)
      .select()
      .single();

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
    return data;
  } catch (error) {
    console.error('[ProjectsOffline] Error creating project:', error);
    throw error;
  }
}

export async function updateProjectOffline(id: string, updates: Partial<Project>): Promise<Project> {
  const updatedProject = { id, ...updates };

  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
    return data;
  } catch (error) {
    console.error('[ProjectsOffline] Error updating project:', error);
    throw error;
  }
}

export async function deleteProjectOffline(id: string): Promise<void> {
  try {
    if (!navigator.onLine) {
      throw new Error('Offline: operasi tidak diizinkan. Silakan sambungkan internet.');
    }

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) throw error;
    await offlineStorage.removeCachedData(CACHE_KEY);
  } catch (error) {
    console.error('[ProjectsOffline] Error deleting project:', error);
    throw error;
  }
}

export async function getProjectOffline(id: string): Promise<Project | null> {
  try {
    if (!navigator.onLine) {
      console.log('[ProjectsOffline] Offline, returning null');
      return null;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[ProjectsOffline] Error getting project:', error);
    return null;
  }
}

async function updateCacheOptimistically(action: 'add' | 'update' | 'delete', item: any): Promise<void> {
  const cached = await offlineStorage.getCachedData<Project[]>(CACHE_KEY);
  if (!cached) return;

  let updated: Project[];
  switch (action) {
    case 'add':
      updated = [item, ...cached];
      break;
    case 'update':
      updated = cached.map(p => p.id === item.id ? { ...p, ...item } : p);
      break;
    case 'delete':
      updated = cached.filter(p => p.id !== item.id);
      break;
  }

  await offlineStorage.cacheData(CACHE_KEY, updated, CACHE_TTL_MINUTES);
}
