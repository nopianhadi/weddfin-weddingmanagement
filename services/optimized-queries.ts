import supabase from '../lib/supabaseClient';

// Lightweight queries untuk dashboard/overview
export async function getProjectsSummary(limit: number = 10) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_name, status, date, total_cost, amount_paid, client_name')
    .order('date', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  return data || [];
}

export async function getClientsSummary(limit: number = 20) {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, email, status, since, phone')
    .order('since', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  return data || [];
}

export async function getRecentActivity(limit: number = 5) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, project_name, status, date, client_name')
    .order('date', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  return data || [];
}

// Dashboard stats tanpa mengambil semua data
export async function getDashboardStats() {
  const [projectsCount, clientsCount, activeProjects, recentProjects] = await Promise.all([
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).neq('status', 'Completed'),
    supabase.from('projects').select('total_cost, amount_paid').gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ]);

  // Calculate revenue from recent projects
  const recentRevenue = (recentProjects.data || []).reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);

  return {
    totalProjects: projectsCount.count || 0,
    totalClients: clientsCount.count || 0,
    activeProjects: activeProjects.count || 0,
    recentRevenue
  };
}

// Optimized data loading untuk initial app load
export async function getInitialAppData() {
  const [dashboardStats, recentProjects, recentClients] = await Promise.all([
    getDashboardStats(),
    getProjectsSummary(5),
    getClientsSummary(10)
  ]);

  return {
    stats: dashboardStats,
    recentProjects,
    recentClients
  };
}

// Minimal data untuk dropdown/select options
export async function getClientsForDropdown() {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name');
    
  if (error) throw error;
  return data || [];
}

export async function getTeamMembersForDropdown() {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, role')
    .order('name');
    
  if (error) throw error;
  return data || [];
}

export async function getPackagesForDropdown() {
  const { data, error } = await supabase
    .from('packages')
    .select('id, name, price')
    .order('name');
    
  if (error) throw error;
  return data || [];
}