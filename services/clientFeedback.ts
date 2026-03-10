import supabase from '../lib/supabaseClient';
import { ClientFeedback, SatisfactionLevel } from '../types';

const TABLE = 'client_feedback';

function fromRow(row: any): ClientFeedback {
  return {
    id: row.id,
    clientName: row.client_name,
    satisfaction: row.satisfaction as SatisfactionLevel,
    rating: Number(row.rating || 0),
    feedback: row.feedback,
    date: row.date,
  };
}

function toRow(cf: Partial<ClientFeedback>): any {
  return {
    ...(cf.clientName !== undefined ? { client_name: cf.clientName } : {}),
    ...(cf.satisfaction !== undefined ? { satisfaction: cf.satisfaction } : {}),
    ...(cf.rating !== undefined ? { rating: cf.rating } : {}),
    ...(cf.feedback !== undefined ? { feedback: cf.feedback } : {}),
    ...(cf.date !== undefined ? { date: cf.date } : {}),
  };
}

export async function listClientFeedback(): Promise<ClientFeedback[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createClientFeedback(payload: Omit<ClientFeedback, 'id'>): Promise<ClientFeedback> {
  const row = toRow(payload);
  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) throw error;
  return fromRow(data);
}
