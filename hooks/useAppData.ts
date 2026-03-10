import { useState, useCallback, useRef } from 'react';
import type { Client, Project, TeamMember, Transaction, Lead, ClientFeedback } from '../types';

/** Default limit for list fetches in useAppData (dashboard/lazy load). Use listXPaginated in pages for full pagination. */
const DEFAULT_LIST_LIMIT = 100;

interface AppDataState {
  clients: Client[];
  projects: Project[];
  teamMembers: TeamMember[];
  transactions: Transaction[];
  leads: Lead[];
  clientFeedback: ClientFeedback[];
  totals: {
    projects: number;
    activeProjects: number;
    clients: number;
    activeClients: number;
    leads: number;
    discussionLeads: number;
    followUpLeads: number;
    teamMembers: number;
    transactions: number;
    revenue: number;
    expense: number;
  };
  loading: {
    clients: boolean;
    projects: boolean;
    teamMembers: boolean;
    transactions: boolean;
    leads: boolean;
    clientFeedback: boolean;
    totals: boolean;
  };
  loaded: {
    clients: boolean;
    projects: boolean;
    teamMembers: boolean;
    transactions: boolean;
    leads: boolean;
    clientFeedback: boolean;
    totals: boolean;
  };
}

export function useAppData() {
  // Use refs to track loading/loaded status for stability of callbacks
  const loadingRef = useRef<Record<string, boolean>>({});
  const loadedRef = useRef<Record<string, boolean>>({});

  const [state, setState] = useState<AppDataState>({
    clients: [],
    projects: [],
    teamMembers: [],
    transactions: [],
    leads: [],
    clientFeedback: [],
    totals: {
      projects: 0,
      activeProjects: 0,
      clients: 0,
      activeClients: 0,
      leads: 0,
      discussionLeads: 0,
      followUpLeads: 0,
      teamMembers: 0,
      transactions: 0,
      revenue: 0,
      expense: 0,
    },
    loading: {
      clients: false,
      projects: false,
      teamMembers: false,
      transactions: false,
      leads: false,
      clientFeedback: false,
      totals: false,
    },
    loaded: {
      clients: false,
      projects: false,
      teamMembers: false,
      transactions: false,
      leads: false,
      clientFeedback: false,
      totals: false,
    }
  });

  // Load clients lazily
  const loadClients = useCallback(async () => {
    if (loadingRef.current.clients || loadedRef.current.clients) return;

    loadingRef.current.clients = true;
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, clients: true }
    }));

    try {
      const { listClients } = await import('../services/clients');
      const clients = await listClients({ limit: DEFAULT_LIST_LIMIT });

      loadedRef.current.clients = true;
      setState(prev => ({
        ...prev,
        clients,
        loading: { ...prev.loading, clients: false },
        loaded: { ...prev.loaded, clients: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch clients:', error);
      loadingRef.current.clients = false;
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, clients: false }
      }));
    }
  }, []);

  // Load projects lazily
  const loadProjects = useCallback(async () => {
    if (loadingRef.current.projects || loadedRef.current.projects) return;

    loadingRef.current.projects = true;
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, projects: true }
    }));

    try {
      const { listProjectsWithRelations } = await import('../services/projects');
      const projects = await listProjectsWithRelations({ limit: DEFAULT_LIST_LIMIT });

      loadedRef.current.projects = true;
      setState(prev => ({
        ...prev,
        projects,
        loading: { ...prev.loading, projects: false },
        loaded: { ...prev.loaded, projects: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch projects:', error);
      loadingRef.current.projects = false;
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, projects: false }
      }));
    }
  }, []);

  // Load team members lazily
  const loadTeamMembers = useCallback(async () => {
    if (loadingRef.current.teamMembers || loadedRef.current.teamMembers) return;

    loadingRef.current.teamMembers = true;
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, teamMembers: true }
    }));

    try {
      const { listTeamMembers } = await import('../services/teamMembers');
      const teamMembers = await listTeamMembers({ limit: DEFAULT_LIST_LIMIT });

      loadedRef.current.teamMembers = true;
      setState(prev => ({
        ...prev,
        teamMembers,
        loading: { ...prev.loading, teamMembers: false },
        loaded: { ...prev.loaded, teamMembers: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch team members:', error);
      loadingRef.current.teamMembers = false;
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, teamMembers: false }
      }));
    }
  }, []);

  // Load transactions lazily
  const loadTransactions = useCallback(async () => {
    if (loadingRef.current.transactions || loadedRef.current.transactions) return;

    loadingRef.current.transactions = true;
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, transactions: true }
    }));

    try {
      const { listTransactions } = await import('../services/transactions');
      const transactions = await listTransactions({ limit: DEFAULT_LIST_LIMIT });

      loadedRef.current.transactions = true;
      setState(prev => ({
        ...prev,
        transactions,
        loading: { ...prev.loading, transactions: false },
        loaded: { ...prev.loaded, transactions: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch transactions:', error);
      loadingRef.current.transactions = false;
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, transactions: false }
      }));
    }
  }, []);

  // Load leads lazily
  const loadLeads = useCallback(async () => {
    if (loadingRef.current.leads || loadedRef.current.leads) return;

    loadingRef.current.leads = true;
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, leads: true }
    }));

    try {
      const { listLeads } = await import('../services/leads');
      const leads = await listLeads({ limit: DEFAULT_LIST_LIMIT });

      loadedRef.current.leads = true;
      setState(prev => ({
        ...prev,
        leads,
        loading: { ...prev.loading, leads: false },
        loaded: { ...prev.loaded, leads: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch leads:', error);
      loadingRef.current.leads = false;
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, leads: false }
      }));
    }
  }, []);

  // Load client feedback lazily
  const loadClientFeedback = useCallback(async () => {
    if (loadingRef.current.clientFeedback || loadedRef.current.clientFeedback) return;

    loadingRef.current.clientFeedback = true;
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, clientFeedback: true }
    }));

    try {
      const { listClientFeedback } = await import('../services/clientFeedback');
      const clientFeedback = await listClientFeedback();

      loadedRef.current.clientFeedback = true;
      setState(prev => ({
        ...prev,
        clientFeedback,
        loading: { ...prev.loading, clientFeedback: false },
        loaded: { ...prev.loaded, clientFeedback: true }
      }));
    } catch (error) {
      console.warn('[Supabase] Failed to fetch client feedback:', error);
      loadingRef.current.clientFeedback = false;
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, clientFeedback: false }
      }));
    }
  }, []);

  const loadTotals = useCallback(async () => {
    if (loadingRef.current.totals || loadedRef.current.totals) return;

    loadingRef.current.totals = true;
    setState(prev => ({
      ...prev,
      loading: { ...prev.loading, totals: true }
    }));

    try {
      const [
        { data: pData, error: pErr },
        { data: cData, error: cErr },
        { data: lData, error: lErr },
        { count: tmCount, error: tmErr },
        { data: tData, count: tCount, error: tErr }
      ] = await Promise.all([
        import('../lib/supabaseClient').then(m => m.supabase.from('projects').select('status')),
        import('../lib/supabaseClient').then(m => m.supabase.from('clients').select('status')),
        import('../lib/supabaseClient').then(m => m.supabase.from('leads').select('status')),
        import('../lib/supabaseClient').then(m => m.supabase.from('team_members').select('*', { count: 'exact', head: true })),
        import('../lib/supabaseClient').then(m => m.supabase.from('transactions').select('type, amount', { count: 'exact' }))
      ]);

      if (pErr || cErr || lErr || tmErr || tErr) throw (pErr || cErr || lErr || tmErr || tErr);

      const activeProjects = (pData || []).filter(p => p.status !== 'Selesai' && p.status !== 'Dibatalkan').length;
      const activeClients = (cData || []).filter(c => c.status === 'Active').length;
      const discussionLeads = (lData || []).filter(l => l.status === 'Discussion').length;
      const followUpLeads = (lData || []).filter(l => l.status === 'Follow Up').length;

      let rev = 0;
      let exp = 0;
      (tData || []).forEach(row => {
        if (row.type === 'Pemasukan') rev += Number(row.amount || 0);
        else if (row.type === 'Pengeluaran') exp += Number(row.amount || 0);
      });

      loadedRef.current.totals = true;
      setState(prev => ({
        ...prev,
        totals: {
          projects: pData?.length || 0,
          activeProjects,
          clients: cData?.length || 0,
          activeClients,
          leads: lData?.length || 0,
          discussionLeads,
          followUpLeads,
          teamMembers: tmCount || 0,
          transactions: tCount || 0,
          revenue: rev,
          expense: exp,
        },
        loading: { ...prev.loading, totals: false },
        loaded: { ...prev.loaded, totals: true }
      }));
    } catch (err) {
      console.warn('[Supabase] Failed to fetch global totals:', err);
      loadingRef.current.totals = false;
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, totals: false }
      }));
    }
  }, []);

  return {
    ...state,
    loadClients,
    loadProjects,
    loadTeamMembers,
    loadTransactions,
    loadLeads,
    loadClientFeedback,
    loadTotals
  };
}

export default useAppData;