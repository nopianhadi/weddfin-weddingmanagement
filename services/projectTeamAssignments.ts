import supabase from '../lib/supabaseClient';
import { AssignedTeamMember } from '../types';

const TABLE = 'project_team_assignments';

function toRow(projectId: string, a: AssignedTeamMember) {
  return {
    project_id: projectId,
    member_id: a.memberId,
    member_name: a.name,
    member_role: a.role,
    fee: a.fee ?? 0,
    reward: a.reward ?? 0,
    sub_job: a.subJob ?? null,
  } as any;
}

function fromRow(row: any): AssignedTeamMember {
  return {
    memberId: row.member_id,
    name: row.member_name,
    role: row.member_role,
    fee: Number(row.fee || 0),
    reward: Number(row.reward || 0),
    subJob: row.sub_job || undefined,
  };
}

export async function listAssignmentsByProject(projectId: string): Promise<AssignedTeamMember[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function upsertAssignmentsForProject(projectId: string, assignments: AssignedTeamMember[]): Promise<void> {
  
  
  // simple strategy: delete then insert
  const { error: delErr } = await supabase.from(TABLE).delete().eq('project_id', projectId);
  if (delErr) {
    console.error('Delete error:', delErr);
    throw delErr;
  }
  
  
  if (!assignments || assignments.length === 0) {
    return;
  }
  
  const rows = assignments.map(a => toRow(projectId, a));
  
  const { error: insErr } = await supabase.from(TABLE).insert(rows);
  if (insErr) {
    console.error('Insert error:', insErr);
    throw insErr;
  }
}

export async function deleteAssignmentsByProject(projectId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('project_id', projectId);
  if (error) throw error;
}
