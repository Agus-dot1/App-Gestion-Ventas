'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CustomerForm } from '@/components/customers/customer-form';
import { CustomerProfile } from '@/components/customers/customer-profile';
import { EnhancedCustomersTable } from '@/components/customers/customers-table';
import { CustomersSkeleton } from '@/components/skeletons/customers-skeleton';
import { Plus, Users, TrendingUp, Calendar, Database } from 'lucide-react';
import type { Customer } from '@/lib/database-operations';
import { useDataCache, usePrefetch } from '@/hooks/use-data-cache';

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [viewingCustomer, setViewingCustomer] = useState<Customer | undefined>();
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);
  const [isLoading, setIsLoading] = useState(false); // Start with false for optimistic navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [allCustomerIds, setAllCustomerIds] = useState<number[]>([]);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  const pageSize = 10; // Load 10 customers per page to match table pagination
  const dataCache = useDataCache();
  const { prefetchProducts, prefetchSales } = usePrefetch();

  useEffect(() => {
    if (isElectron) {
      loadCustomers();
      loadAllCustomerIds();
    }
  }, []);

  // Initial data load - optimistic approach
  useEffect(() => {
    if (isElectron) {
      loadCustomers();
    }
  }, [isElectron]);
  
  // Optimistic data loading on mount
  useEffect(() => {
    if (isElectron && dataCache) {
      // Check if we have cached data first
      const cachedData = dataCache.getCachedCustomers(currentPage, pageSize, searchTerm);
      if (cachedData) {
        // Show cached data immediately
        setCustomers(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
      } else {
        // No cache, show loading only if no data exists
        if (customers.length === 0) {
          setIsLoading(true);
        }
      }
    }
  }, [isElectron, dataCache]);

  // Reload customers when search term or page changes
  useEffect(() => {
    if (isElectron && customers.length > 0) {
      // Only reload if we already have data loaded
      setTimeout(() => {
        loadCustomers();
      }, 0);
    }
  }, [searchTerm, currentPage]);

  // Highlight customer if specified in URL
  const highlightedCustomer = useMemo(() => {
    if (!highlightId) return null;
    return customers.find(customer => customer.id?.toString() === highlightId);
  }, [customers, highlightId]);

  useEffect(() => {
    if (highlightedCustomer && highlightedCustomer.id) {
      // Scroll to highlighted customer after a short delay
      setTimeout(() => {
        const element = document.getElementById(`customer-${highlightedCustomer.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 100);
    }
  }, [highlightedCustomer]);


  // Load all customer IDs for global selection
  const loadAllCustomerIds = async () => {
    try {
      const allCustomers = await window.electronAPI.database.customers.getAll();
      const ids = allCustomers.map(c => c.id).filter(id => id !== undefined) as number[];
      setAllCustomerIds(ids);
    } catch (error) {
      console.error('Error loading all customer IDs:', error);
    }
  };

  const loadCustomers = async (forceRefresh = false) => {
    try {
      const cachedData = dataCache.getCachedCustomers(currentPage, pageSize, searchTerm);
      const isCacheExpired = dataCache.isCustomersCacheExpired(currentPage, pageSize, searchTerm);
      
      if (cachedData && !forceRefresh) {
        setCustomers(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
        setIsLoading(false);
        
        if (!isCacheExpired) {
          setTimeout(() => {
            prefetchProducts();
            prefetchSales();
          }, 100);
          return;
        }

      } else {
        setIsLoading(true);
      }
      
      const result = await window.electronAPI.database.customers.getPaginated(
        currentPage,
        pageSize,
        searchTerm
      );
      
      setCustomers(result.customers);
      setPaginationInfo({
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize
      });
      
      // Cache the result
      dataCache.setCachedCustomers(currentPage, pageSize, searchTerm, {
        items: result.customers,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize,
        searchTerm,
        timestamp: Date.now()
      });
      
      // Prefetch other pages in background
      setTimeout(() => {
        prefetchProducts();
        prefetchSales();
      }, 100);
      
    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'created_at'>) => {
    try {
      if (editingCustomer?.id) {
        // Update existing customer
        await window.electronAPI.database.customers.update(editingCustomer.id, customerData);
      } else {
        // Create new customer
        await window.electronAPI.database.customers.create(customerData);
      }
      
      // Clear cache and force refresh to ensure fresh data is loaded
      dataCache.invalidateCache('customers');
      await loadCustomers(true);
      await loadAllCustomerIds(); // Refresh all customer IDs
      
      // Close form and reset editing state after successful save and reload
      setEditingCustomer(undefined);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error guardando cliente:', error);
      throw error; // Re-throw to let the form handle the error
    }
  };

  const addMockCustomers = async () => {
    const mockCustomers = [
      {
        name: 'Agustin de Olveira',
        dni: '45686722',
        email: 'agustin.olveira@email.com',
        phone: '+54 11 32170664',
        address: 'El resero 4141, Gregorio de Laferrere',
        notes: 'Referido: juan'
      },
      {
        name: 'Matias Ezequiel Reynoso',
        dni: '23456789',
        email: 'matias.reynoso@email.com',
        phone: '+54 11 23456789',
        address: 'Puerta de hierro'
      },
      {
        name: 'Facundo Cruz',
        dni: '34567890',
        phone: '+54 11 45678901',
        address: 'San pedro',
        notes: 'Referencia: Hincha del rojo'
      },
      {
        name: 'Cain Elian Silva Pais',
        dni: '45678901',
        email: 'cain.silva@email.com',
        phone: '+54 11 45678901',
        address: 'Suarez 980, La Boca'
      },
      {
        name: 'Mauro Julian López',
        dni: '56789012',
        email: 'Mauro.López@email.com',
        phone: '+54 11 56789012',
        address: 'Da vinci 400, Gregorio de Laferrere',
        company: 'Referencia: Mago'
      },
      {
        name: 'Leandro Gluckszack',
        dni: '67890123',
        email: 'leandro.gluckszack@email.com',
        phone: '+54 11 56789012',
        address: 'Laferrere'
      },
      {
        name: 'Ulises Godoy',
        dni: '78901234',
        email: 'ulises.godoy@email.com',
        phone: '+54 11 67890123',
        notes: 'direccion: no proporcionada'
      },
    ];

    try {
      for (const customer of mockCustomers) {
        window.electronAPI.database.customers.create(customer);
      }
      await loadCustomers();
      console.log('Mock customers added successfully');
    } catch (error) {
      console.error('Error adding mock customers:', error);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleDeleteCustomer = async (customerId: number) => {
    try {
      await window.electronAPI.database.customers.delete(customerId);
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      dataCache.invalidateCache('customers');
    } catch (error: any) {
      console.error('Error eliminando cliente:', error);
      // Show error to user
      alert(error.message || 'Error al eliminar cliente. Porfavor intente de nuevo.');
    }
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll && allCustomerIds.length === 0) {
      loadAllCustomerIds();
    }
  };

  // Function to fetch customers by their IDs for export functionality
  const getCustomersByIds = async (ids: number[]): Promise<Customer[]> => {
    try {
      const allCustomers = await window.electronAPI.database.customers.getAll();
      return allCustomers.filter(customer => customer.id && ids.includes(customer.id));
    } catch (error) {
      console.error('Error fetching customers by IDs:', error);
      return [];
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(undefined);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingCustomer(undefined);
    }
  };

  // Calculate statistics
  const stats = {
    total: customers.length,
    withContact: customers.filter(c => c.contact_info && c.contact_info.trim()).length,
    withoutContact: customers.filter(c => !c.contact_info || !c.contact_info.trim()).length,
    recentlyAdded: customers.filter(c => {
      if (!c.created_at) return false;
      const createdDate = new Date(c.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate > thirtyDaysAgo;
    }).length
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
              <p className="text-muted-foreground">
                Acá podés ver y gestionar todos tus clientes. Podés añadir nuevos, editar o eliminar los existentes.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={addMockCustomers} 
                disabled={!isElectron}
              >
                <Database className="mr-2 h-4 w-4" />
                Añadir clientes de prueba
              </Button>
              <Button onClick={handleAddCustomer} disabled={!isElectron}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Cliente
              </Button>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        {!isElectron ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Electron Required</h3>
                <p className="text-muted-foreground">
                  Customer management is only available in the Electron desktop app.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isLoading && customers.length === 0 ? (
          <CustomersSkeleton />
        ) : (
          <EnhancedCustomersTable
            customers={customers}
            highlightId={highlightId}
            onEdit={handleEditCustomer}
            onView={handleViewCustomer}
            onDelete={handleDeleteCustomer}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            paginationInfo={paginationInfo}
            serverSidePagination={true}
            allCustomerIds={allCustomerIds}
            onSelectAll={handleSelectAll}
            onGetCustomersByIds={getCustomersByIds}
          />
        )}

        {/* Customer Form Dialog */}
        <CustomerForm
          customer={editingCustomer}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSave={handleSaveCustomer}
        />

        {/* Customer Profile Modal */}
        {viewingCustomer && (
          <CustomerProfile
            customer={viewingCustomer}
            onEdit={(customer) => {
              setEditingCustomer(customer);
              setIsFormOpen(true);
            }}
            onClose={() => setViewingCustomer(undefined)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}