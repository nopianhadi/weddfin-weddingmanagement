import supabase from '../lib/supabaseClient';
import { TeamMember, PerformanceNote } from '../types';

const TABLE = 'team_members';

function normalize(row: any): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    standardFee: Number(row.standard_fee || 0),
    noRek: row.no_rek ?? undefined,
    bankName: row.bank_name ?? undefined,
    specialization: row.specialization ?? undefined,
    location: row.location ?? undefined,
    emergencyContact: row.emergency_contact ?? undefined,
    rewardBalance: Number(row.reward_balance || 0),
    rating: Number(row.rating || 0),
    performanceNotes: (row.performance_notes ?? []) as PerformanceNote[],
    portalAccessId: row.portal_access_id,
    category: row.category || 'Tim',
  };
}

function denormalize(obj: Partial<TeamMember>): any {
  return {
    ...(obj.name !== undefined ? { name: obj.name } : {}),
    ...(obj.role !== undefined ? { role: obj.role } : {}),
    ...(obj.email !== undefined ? { email: obj.email } : {}),
    ...(obj.phone !== undefined ? { phone: obj.phone } : {}),
    ...(obj.standardFee !== undefined ? { standard_fee: obj.standardFee } : {}),
    ...(obj.noRek !== undefined ? { no_rek: obj.noRek } : {}),
    ...(obj.bankName !== undefined ? { bank_name: obj.bankName } : {}),
    ...(obj.specialization !== undefined ? { specialization: obj.specialization } : {}),
    ...(obj.location !== undefined ? { location: obj.location } : {}),
    ...(obj.emergencyContact !== undefined ? { emergency_contact: obj.emergencyContact } : {}),
    ...(obj.rewardBalance !== undefined ? { reward_balance: obj.rewardBalance } : {}),
    ...(obj.rating !== undefined ? { rating: obj.rating } : {}),
    // ...(obj.performanceNotes !== undefined ? { performance_notes: obj.performanceNotes } : {}),
    ...(obj.portalAccessId !== undefined ? { portal_access_id: obj.portalAccessId } : {}),
    ...(obj.category !== undefined ? { category: obj.category } : {}),
  };
}

export async function listTeamMembers(options: { limit?: number; offset?: number } = {}): Promise<TeamMember[]> {
  const limit = Math.min(100, options.limit || 50); // Default 50, max 100
  const offset = options.offset || 0;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data || []).map(normalize);
}

export async function listTeamMembersPaginated(page: number = 1, limit: number = 20): Promise<{
  teamMembers: TeamMember[];
  total: number;
  hasMore: boolean;
}> {
  const offset = (page - 1) * limit;

  // Get total count
  const { count, error: countError } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;

  // Get paginated data
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('name')
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const teamMembers = (data || []).map(normalize);
  const total = count || 0;

  return {
    teamMembers,
    total,
    hasMore: (page * limit) < total
  };
}

export async function createTeamMember(payload: Omit<TeamMember, 'id'>): Promise<TeamMember> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalize(payload)])
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateTeamMember(id: string, patch: Partial<TeamMember>): Promise<TeamMember> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalize(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
