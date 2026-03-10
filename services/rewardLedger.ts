import supabase from '../lib/supabaseClient';
import { RewardLedgerEntry } from '../types';

const TABLE = 'reward_ledger_entries';

function fromRow(row: any): RewardLedgerEntry {
  return {
    id: row.id,
    teamMemberId: row.team_member_id,
    date: row.date,
    description: row.description,
    amount: Number(row.amount || 0),
    projectId: row.project_id ?? undefined,
  };
}

function toRow(patch: Partial<RewardLedgerEntry>): any {
  return {
    ...(patch.teamMemberId !== undefined ? { team_member_id: patch.teamMemberId } : {}),
    ...(patch.date !== undefined ? { date: patch.date } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
    ...(patch.projectId !== undefined ? { project_id: patch.projectId ?? null } : {}),
  };
}

export async function listRewardLedgerEntries(): Promise<RewardLedgerEntry[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createRewardLedgerEntry(payload: Omit<RewardLedgerEntry, 'id'>): Promise<RewardLedgerEntry> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(toRow(payload))
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateRewardLedgerEntry(id: string, patch: Partial<RewardLedgerEntry>): Promise<RewardLedgerEntry> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(toRow(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function deleteRewardLedgerEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
}
