import supabase from '../lib/supabaseClient';
import { TeamProjectPayment } from '../types';

const TABLE = 'team_project_payments';

function toRow(p: TeamProjectPayment) {
  const isUuid = (v?: string) => !!v && /^[0-9a-fA-F-]{36}$/.test(v);
  const row: any = {
    project_id: p.projectId,
    team_member_name: p.teamMemberName,
    team_member_id: p.teamMemberId,
    date: p.date,
    status: p.status,
    fee: p.fee,
    reward: p.reward ?? 0,
  };
  // Only pass id if it's a valid UUID; otherwise let DB generate it
  if (isUuid(p.id as any)) row.id = p.id;
  return row;
}

function fromRow(row: any): TeamProjectPayment {
  return {
    id: row.id,
    projectId: row.project_id,
    teamMemberName: row.team_member_name,
    teamMemberId: row.team_member_id,
    date: row.date,
    status: row.status,
    fee: Number(row.fee || 0),
    reward: Number(row.reward || 0),
  };
}

export async function listAllTeamPayments(): Promise<TeamProjectPayment[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function listTeamPaymentsByProject(projectId: string): Promise<TeamProjectPayment[]> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('project_id', projectId);
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function upsertTeamPaymentsForProject(projectId: string, items: TeamProjectPayment[]): Promise<TeamProjectPayment[]> {
  // strategy: delete all for project, then insert
  const { error: delErr } = await supabase.from(TABLE).delete().eq('project_id', projectId);
  if (delErr) throw delErr;
  if (!items || items.length === 0) return [];
  const rows = items.map(toRow);
  const { data, error: insErr } = await supabase.from(TABLE).insert(rows).select();
  if (insErr) throw insErr;
  return (data || []).map(fromRow);
}

export async function markTeamPaymentStatus(id: string, status: 'Paid' | 'Unpaid'): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateTeamPaymentFee(id: string, fee: number, status: 'Paid' | 'Unpaid'): Promise<void> {
  const { error } = await supabase.from(TABLE).update({ fee, status }).eq('id', id);
  if (error) throw error;
}

export async function deleteTeamPaymentsByProject(projectId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('project_id', projectId);
  if (error) throw error;
}
