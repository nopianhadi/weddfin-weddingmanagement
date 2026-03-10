import supabase from '../lib/supabaseClient';
import { User, ViewType } from '../types';

const TABLE = 'users';

function fromRow(row: any): User {
  return {
    id: row.id,
    email: row.email,
    password: row.password, // Note: In production, never return password
    fullName: row.full_name,
    companyName: row.company_name || undefined,
    role: row.role || 'Member',
    permissions: row.permissions || [],
  };
}

function toRow(u: Partial<User>): any {
  return {
    ...(u.email !== undefined ? { email: u.email } : {}),
    ...(u.password !== undefined ? { password: u.password } : {}),
    ...(u.fullName !== undefined ? { full_name: u.fullName } : {}),
    ...(u.companyName !== undefined ? { company_name: u.companyName } : {}),
    ...(u.role !== undefined ? { role: u.role } : {}),
    ...(u.permissions !== undefined ? { permissions: u.permissions } : {}),
  };
}

export async function listUsers(): Promise<User[]> {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(fromRow);
}

export async function createUser(input: Omit<User, 'id'>): Promise<User> {
  const row = toRow(input);
  const { data, error } = await supabase.from(TABLE).insert(row).select('*').single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateUser(userId: string, input: Partial<Omit<User, 'id'>>): Promise<User> {
  const row = toRow(input);
  const { error } = await supabase.from(TABLE).update(row).eq('id', userId);
  if (error) throw error;
  const { data, error: err2 } = await supabase.from(TABLE).select('*').eq('id', userId).single();
  if (err2) throw err2;
  return fromRow(data);
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', userId);
  if (error) throw error;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('email', email).maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data ? fromRow(data) : null;
}
