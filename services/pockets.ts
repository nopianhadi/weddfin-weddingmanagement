import supabase from '../lib/supabaseClient';
import { FinancialPocket } from '../types';

const TABLE = 'financial_pockets';

function fromRow(row: any): FinancialPocket {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    type: row.type,
    amount: Number(row.amount || 0),
    goalAmount: row.goal_amount ?? undefined,
    lockEndDate: row.lock_end_date ?? undefined,
    sourceCardId: row.source_card_id ?? undefined,
    // members omitted; if needed, store in another table or JSONB
  } as FinancialPocket;
}

function toRow(patch: Partial<FinancialPocket>): any {
  return {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
    ...(patch.type !== undefined ? { type: patch.type } : {}),
    ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
    ...(patch.goalAmount !== undefined ? { goal_amount: patch.goalAmount } : {}),
    ...(patch.lockEndDate !== undefined ? { lock_end_date: patch.lockEndDate } : {}),
    ...(patch.sourceCardId !== undefined ? { source_card_id: patch.sourceCardId ?? null } : {}),
  };
}

export async function listPockets(): Promise<FinancialPocket[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createPocket(payload: Omit<FinancialPocket, 'id' | 'members'>): Promise<FinancialPocket> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(toRow(payload))
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updatePocket(id: string, patch: Partial<FinancialPocket>): Promise<FinancialPocket> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(toRow(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deletePocket(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
