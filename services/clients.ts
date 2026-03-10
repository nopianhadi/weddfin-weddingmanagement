import supabase from '../lib/supabaseClient';
import { Client, ClientStatus, ClientType } from '../types';

const TABLE = 'clients';

export async function listClients(options: { limit?: number; offset?: number } = {}): Promise<Client[]> {
  const limit = Math.min(100, options.limit || 50); // Default 50, max 100
  const offset = options.offset || 0;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('since', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data || []).map(row => normalizeClient(row));
}

export async function listClientsPaginated(
  page: number = 1,
  limit: number = 20,
  searchQuery?: string,
  filters?: {
    status?: string;
    clientType?: string;
  }
): Promise<{
  clients: Client[];
  total: number;
  hasMore: boolean;
}> {
  const offset = (page - 1) * limit;

  // Build query with search and filters
  let query = supabase.from(TABLE).select('*', { count: 'exact' });
  let countQuery = supabase.from(TABLE).select('*', { count: 'exact', head: true });

  // Apply search
  if (searchQuery && searchQuery.trim()) {
    const searchTerm = `%${searchQuery.trim()}%`;
    query = query.or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`);
    countQuery = countQuery.or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`);
  }

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
    countQuery = countQuery.eq('status', filters.status);
  }

  if (filters?.clientType) {
    query = query.eq('client_type', filters.clientType);
    countQuery = countQuery.eq('client_type', filters.clientType);
  }

  // Get total count
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  // Get paginated data
  const { data, error } = await query
    .order('since', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const clients = (data || []).map(row => normalizeClient(row));
  const total = count || 0;

  return {
    clients,
    total,
    hasMore: (page * limit) < total
  };
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if ((error as any).code === 'PGRST116') return null; // not found
    throw error;
  }
  return data ? normalizeClient(data) : null;
}

export async function createClient(payload: Omit<Client, 'id'>): Promise<Client> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([denormalizeClient(payload)])
    .select()
    .single();
  if (error) throw error;
  return normalizeClient(data);
}

export async function updateClient(id: string, patch: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalizeClient(patch))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return normalizeClient(data);
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Helpers to map between DB row and TS type (in case of snake_case in DB)
function normalizeClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp ?? undefined,
    since: row.since,
    instagram: row.instagram ?? undefined,
    status: row.status as ClientStatus,
    clientType: row.client_type as ClientType,
    lastContact: row.last_contact,
    portalAccessId: row.portal_access_id,
    address: row.address ?? undefined,
  };
}

function denormalizeClient(obj: Partial<Client>): any {
  return {
    ...(obj.id !== undefined ? { id: obj.id } : {}),
    ...(obj.name !== undefined ? { name: obj.name } : {}),
    ...(obj.email !== undefined ? { email: obj.email } : {}),
    ...(obj.phone !== undefined ? { phone: obj.phone } : {}),
    ...(obj.whatsapp !== undefined ? { whatsapp: obj.whatsapp } : {}),
    ...(obj.since !== undefined ? { since: obj.since } : {}),
    ...(obj.instagram !== undefined ? { instagram: obj.instagram } : {}),
    ...(obj.status !== undefined ? { status: obj.status } : {}),
    ...(obj.clientType !== undefined ? { client_type: obj.clientType } : {}),
    ...(obj.lastContact !== undefined ? { last_contact: obj.lastContact } : {}),
    ...(obj.portalAccessId !== undefined ? { portal_access_id: obj.portalAccessId } : {}),
    ...(obj.address !== undefined ? { address: obj.address } : {}),
  };
}
