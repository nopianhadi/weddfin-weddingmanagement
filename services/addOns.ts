import supabase from '../lib/supabaseClient';
import { AddOn } from '../types';

const TABLE = 'add_ons';

function normalize(row: any): AddOn {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price || 0),
    region: row.region ?? undefined,
  } as AddOn;
}

function denormalize(obj: Partial<AddOn>): any {
  return {
    ...(obj.name !== undefined ? { name: obj.name } : {}),
    ...(obj.price !== undefined ? { price: obj.price } : {}),
    ...(obj.region !== undefined ? { region: obj.region } : {}),
  };
}

export async function listAddOns(): Promise<AddOn[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('name');
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function createAddOn(payload: Omit<AddOn, 'id' | 'createdAt'>): Promise<AddOn> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalize(payload)])
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateAddOn(id: string, patch: Partial<AddOn>): Promise<AddOn> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalize(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteAddOn(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
