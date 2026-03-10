import React from 'react';
import { useSearchableInfiniteScroll } from '../hooks/useSearchableInfiniteScroll';
import { InfiniteScrollContainer } from './components/InfiniteScrollContainer';
import { SearchBar } from '../components/SearchBar';
import { FilterBar } from '../components/FilterBar';
import { listClientsPaginated } from '../services/clients';

// Example: Clients with infinite scroll and search
export const ClientsInfiniteScrollExample: React.FC = () => {
  const {
    items: clients,
    loading,
    hasMore,
    error,
    loadingRef,
    searchQuery,
    filters,
    updateSearch,
    updateFilters,
    clearFilters,
    clearSearch,
    isSearching,
    retry
  } = useSearchableInfiniteScroll({
    fetchFn: async (page, limit, searchQuery, filters) => {
      const result = await listClientsPaginated(page, limit, searchQuery, filters);
      return {
        data: result.clients,
        hasMore: result.hasMore,
        total: result.total
      };
    },
    limit: 20
  });

  const filterConfigs = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'Aktif', label: 'Aktif' },
        { value: 'Tidak Aktif', label: 'Tidak Aktif' },
        { value: 'Prospek', label: 'Prospek' }
      ]
    },
    {
      key: 'clientType',
      label: 'Tipe Klien',
      type: 'select' as const,
      options: [
        { value: 'Langsung', label: 'Langsung' },
        { value: 'Vendor', label: 'Vendor' }
      ]
    }
  ];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={updateSearch}
        placeholder="Cari klien berdasarkan nama, email, atau telepon..."
        isSearching={isSearching}
        onClear={clearSearch}
      />

      {/* Filters */}
      <FilterBar
        filters={filters}
        onFilterChange={updateFilters}
        onClearFilters={clearFilters}
        filterConfigs={filterConfigs}
      />

      {/* Results */}
      <InfiniteScrollContainer
        loading={loading}
        hasMore={hasMore}
        error={error}
        onRetry={retry}
        loadingRef={loadingRef}
        loadingMessage="Memuat klien..."
        noMoreMessage="Semua klien telah dimuat"
      >
        <div className="grid gap-4">
          {clients.map((client) => (
            <div key={client.id} className="p-4 border rounded-lg bg-white shadow-sm">
              <h3 className="font-semibold">{client.name}</h3>
              <p className="text-gray-600">{client.email}</p>
              <p className="text-sm text-gray-500">{client.phone}</p>
              <div className="mt-2 flex gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  client.status === 'Aktif' ? 'bg-green-100 text-green-800' :
                  client.status === 'Tidak Aktif' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {client.status}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                  {client.clientType}
                </span>
              </div>
            </div>
          ))}
        </div>
      </InfiniteScrollContainer>
    </div>
  );
};