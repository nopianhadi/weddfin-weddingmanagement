// Centralized data loader untuk mengurangi egress
import { listClients } from './clients';
import { listProjects } from './projects';
import { listTeamMembers } from './teamMembers';
import { listPackages } from './packages';
import { listAddOns } from './addOns';

// Load only essential data on app startup
export async function loadEssentialData() {
  try {
    // Load only small datasets that are needed immediately
    const [teamMembers, packages, addOns] = await Promise.all([
      listTeamMembers(), // Usually small dataset
      listPackages(),    // Usually small dataset  
      listAddOns()       // Usually small dataset
    ]);

    return {
      teamMembers: Array.isArray(teamMembers) ? teamMembers : [],
      packages: Array.isArray(packages) ? packages : [],
      addOns: Array.isArray(addOns) ? addOns : []
    };
  } catch (error) {
    console.warn('Failed to load essential data:', error);
    return {
      teamMembers: [],
      packages: [],
      addOns: []
    };
  }
}

// Load clients with pagination (lazy)
export async function loadClientsLazy(limit: number = 20) {
  try {
    return await listClients({ limit });
  } catch (error) {
    console.warn('Failed to load clients:', error);
    return [];
  }
}

// Load projects with pagination (lazy)
export async function loadProjectsLazy(limit: number = 20) {
  try {
    return await listProjects({ limit });
  } catch (error) {
    console.warn('Failed to load projects:', error);
    return [];
  }
}

// Load data on demand based on view
export async function loadDataForView(viewType: string) {
  switch (viewType.toLowerCase()) {
    case 'projects':
      return {
        projects: await loadProjectsLazy(30)
      };
    
    case 'clients':
      return {
        clients: await loadClientsLazy(30)
      };
    
    case 'dashboard':
      // Dashboard needs summary data only
      const [recentProjects, recentClients] = await Promise.all([
        loadProjectsLazy(5),  // Only 5 recent projects
        loadClientsLazy(5)    // Only 5 recent clients
      ]);
      return {
        recentProjects,
        recentClients
      };
    
    default:
      return {};
  }
}