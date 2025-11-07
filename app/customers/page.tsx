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
import { SHOW_MOCK_BUTTONS } from '@/lib/feature-flags';

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [viewingCustomer, setViewingCustomer] = useState<Customer | undefined>();
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);
  const [isLoading, setIsLoading] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [allCustomerIds, setAllCustomerIds] = useState<number[]>([]);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  const pageSize = 10; 
  const dataCache = useDataCache();
  const { prefetchProducts, prefetchSales } = usePrefetch();

  useEffect(() => {
    if (isElectron) {
      loadCustomers();
      loadAllCustomerIds();
    }
  }, []);

  useEffect(() => {
    if (isElectron) {
      loadCustomers();
    }
  }, [isElectron]);

  useEffect(() => {
    if (isElectron && dataCache) {
      const cachedData = dataCache.getCachedCustomers(currentPage, pageSize, searchTerm);
      if (cachedData) {
        setCustomers(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
      } else {


        if (customers.length === 0) {
          setIsLoading(true);
        }
      }
    }
  }, [isElectron, dataCache]);

  useEffect(() => {
    if (isElectron) {
      loadCustomers();
    }
  }, [searchTerm, currentPage]);

  const highlightedCustomer = useMemo(() => {
    if (!highlightId) return null;
    return customers.find(customer => customer.id?.toString() === highlightId);
  }, [customers, highlightId]);

  useEffect(() => {
    if (highlightedCustomer && highlightedCustomer.id) {
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
      
      dataCache.setCachedCustomers(currentPage, pageSize, searchTerm, {
        items: result.customers,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize,
        searchTerm,
        timestamp: Date.now()
      });
      
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
        await window.electronAPI.database.customers.update(editingCustomer.id, customerData);
      } else {
        await window.electronAPI.database.customers.create(customerData);
      }
      
      dataCache.invalidateCache('customers');
      await loadCustomers(true);
      await loadAllCustomerIds();
      
      setEditingCustomer(undefined);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error guardando cliente:', error);
      throw error;
    }
  };

  const addMockCustomers = async () => {
    const mockCustomers = [
      {
        name: 'Lucía Fernández',
        dni: '32123456',
        email: 'lucia.fernandez@example.com',
        phone: '+54 11 55551234',
        address: 'Av. Santa Fe 1234, CABA',
        payment_window: '1 to 10',
        notes: 'Prefiere contacto por email'
      },
      {
        name: 'Martín Gómez',
        dni: '28900123',
        email: 'martin.gomez@example.com',
        phone: '+54 11 55554444',
        address: 'Belgrano 2200, CABA',
        payment_window: '20 to 30'
      },
      {
        name: 'Carla Rodríguez',
        dni: '33111222',
        email: 'carla.rodriguez@example.com',
        phone: '+54 9 11 56781234',
        address: 'Ituzaingó 450, Lanús',
        payment_window: '20 to 30'
      },
      {
        name: 'Santiago Pérez',
        dni: '30222333',
        phone: '+54 11 55553333',
        address: 'Mitre 980, Quilmes',
        notes: 'Referido por Juan',
        payment_window: '1 to 10'
      },
      {
        name: 'Valentina López',
        dni: '34566789',
        email: 'valentina.lopez@example.com',
        phone: '+54 11 44443333',
        address: 'Rivadavia 789, Morón',
        payment_window: '20 to 30'
      },
      {
        name: 'Nicolás Duarte',
        dni: '37123456',
        email: 'nicolas.duarte@example.com',
        phone: '+54 11 55557777',
        address: 'San Martín 150, Ramos Mejía',
        payment_window: '1 to 10'
      },
      {
        name: 'Julieta Ortiz',
        dni: '31654321',
        email: 'julieta.ortiz@example.com',
        phone: '+54 11 55556666',
        address: 'Av. La Plata 2100, CABA',
        notes: 'Pago en efectivo',
        payment_window: '1 to 10'
      },
      {
        name: 'Gastón Alvarez',
        dni: '33445566',
        phone: '+54 11 55551111',
        address: 'Córdoba 1200, Rosario',
        payment_window: '20 to 30'
      },
      {
        name: 'Camila Herrera',
        dni: '32777888',
        email: 'camila.herrera@example.com',
        phone: '+54 9 11 62341234',
        address: 'Sarmiento 540, Lomas',
        payment_window: '1 to 10'
      },
      {
        name: 'Bruno Silva',
        dni: '31889900',
        email: 'bruno.silva@example.com',
        phone: '+54 11 55550000',
        address: 'Dorrego 700, CABA',
        notes: 'Factura A',
        payment_window: '20 to 30'
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
      alert(error.message || 'Error al eliminar cliente. Porfavor intente de nuevo.');
    }
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll && allCustomerIds.length === 0) {
      loadAllCustomerIds();
    }
  };

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
              <Button onClick={handleAddCustomer} disabled={!isElectron}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Cliente
              </Button>
              {SHOW_MOCK_BUTTONS && (
                <Button onClick={addMockCustomers} variant="outline" disabled={!isElectron}>
                  <Database className="mr-2 h-4 w-4" />
                  Cargar datos de prueba
                </Button>
              )}
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
          <div>
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
          </div>
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