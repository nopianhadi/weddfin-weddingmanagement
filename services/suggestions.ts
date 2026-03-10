import supabase from '../lib/supabaseClient';

export type Suggestion = {
  id: string;
  name: string;
  contact: string;
  message: string;
  date: string; // ISO string
  channel?: string;
};

function fromRow(row: any): Suggestion {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    message: row.message,
    date: row.date,
    channel: row.channel || undefined,
  };
}

function toRow(input: Partial<Suggestion>): any {
  return {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.contact !== undefined ? { contact: input.contact } : {}),
    ...(input.message !== undefined ? { message: input.message } : {}),
    ...(input.date !== undefined ? { date: input.date } : {}),
    ...(input.channel !== undefined ? { channel: input.channel } : {}),
  };
}

const TABLE = 'suggestions';

export async function listSuggestions(): Promise<Suggestion[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createSuggestion(payload: Omit<Suggestion, 'id'>): Promise<Suggestion> {
  const row = toRow(payload);
  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) throw error;
  return fromRow(data);
}
