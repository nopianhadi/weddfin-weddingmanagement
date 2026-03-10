// Contoh implementasi optimasi di App.tsx
import React, { useEffect, useState } from 'react';
import { useDashboardData, useEssentialData } from '../hooks/useDataManager';
import { usePaginatedData } from '../hooks/usePaginatedData';
import { LoadMoreButton } from './components/LoadMoreButton';

// Simple placeholder components for examples
const Dashboard = ({ stats }: { stats: any }) => <div>Dashboard with {stats?.totalProjects} projects</div>;
const ProjectCard = ({ project }: { project: any }) => <div className="p-4 border rounded">{project.projectName}</div>;
const ClientCard = ({ client }: { client: any }) => <div className="p-4 border rounded">{client.clientName}</div>;

// SEBELUM: Multiple useEffect yang memuat semua data
/*
useEffect(() => {
  // Load clients
  listClients().then(setClients);
}, []);

useEffect(() => {
  // Load projects  
  listProjects().then(setProjects);
}, []);

useEffect(() => {
  // Load team members
  listTeamMembers().then(setTeamMembers);
}, []);
// ... 15+ queries saat app start
*/

// SESUDAH: Lazy loading dengan hooks optimized
function OptimizedApp() {
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
  const { data: essentialData, loadEssentialData } = useEssentialData();
  
  // Load essential data hanya saat dibutuhkan
  useEffect(() => {
    loadEssentialData();
  }, [loadEssentialData]);

  return (
    <div>
      {dashboardLoading ? (
        <div>Loading dashboard...</div>
      ) : (
        <div>
          <h1>Dashboard</h1>
          <p>Stats loaded successfully</p>
        </div>
      )}
    </div>
  );
}

// Contoh penggunaan pagination sederhana
function ProjectsList() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const loadMore = async () => {
    setLoading(true);
    try {
      const { listProjectsPaginated } = await import('../services/projects');
      const result = await listProjectsPaginated(page, 20);
      setProjects(prev => [...prev, ...result.projects]);
      setHasMore(result.hasMore);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {projects.map((project: any) => (
        <div key={project.id} className="p-4 border rounded">
          <h3>{project.projectName}</h3>
          <p>{project.clientName}</p>
        </div>
      ))}
      
      <LoadMoreButton
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </div>
  );
}

export { OptimizedApp, ProjectsList };