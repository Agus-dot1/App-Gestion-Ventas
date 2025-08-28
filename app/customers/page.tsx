'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CustomerForm } from '@/components/customers/customer-form';
import { CustomerProfile } from '@/components/customers/customer-profile';
import { EnhancedCustomersTable } from '@/components/customers/enhanced-customers-table';
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
  const [isElectron, setIsElectron] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    if (typeof window !== 'undefined' && window.electronAPI) {
      loadCustomers();
      loadAllCustomerIds();
    }
  }, []);

  // Reload customers when search term or page changes
  useEffect(() => {
    if (isElectron) {
      loadCustomers();
    }
  }, [searchTerm, currentPage, isElectron]);

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
  const dataCache = useDataCache();
  const { prefetchProducts, prefetchSales } = usePrefetch();

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
      setIsLoading(true);
      
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedData = dataCache.getCachedCustomers(currentPage, pageSize, searchTerm);
        if (cachedData) {
          setCustomers(cachedData.items);
          setPaginationInfo({
            total: cachedData.total,
            totalPages: cachedData.totalPages,
            currentPage: cachedData.currentPage,
            pageSize: cachedData.pageSize
          });
          setIsLoading(false);
          
          // Prefetch other pages in background
          setTimeout(() => {
            prefetchProducts();
            prefetchSales();
          }, 100);
          
          return;
        }
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
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '(555) 123-4567',
        address: '123 Main St, Anytown, ST 12345',
        notes: 'Preferred contact method: Email'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.j@email.com',
        phone: '(555) 987-6543',
        address: '456 Oak Avenue, Springfield, ST 67890'
      },
      {
        name: 'Michael Brown',
        phone: '(555) 456-7890',
        address: '789 Pine Street, Riverside, ST 54321',
        notes: 'Best time to call: Evenings'
      },
      {
        name: 'Emily Davis',
        email: 'emily.davis@email.com',
        phone: '(555) 234-5678',
        address: '321 Elm Drive, Lakeside, ST 98765'
      },
      {
        name: 'David Wilson',
        email: 'd.wilson@email.com',
        phone: '(555) 345-6789',
        address: '654 Maple Drive, Hilltown, ST 13579',
        company: 'Wilson Enterprises'
      },
      {
        name: 'Lisa Anderson',
        email: 'lisa.anderson@email.com',
        phone: '(555) 567-8901',
        address: '987 Cedar Lane, Brookfield, ST 24680'
      },
      {
        name: 'Robert Taylor',
        phone: '(555) 678-9012',
        address: '147 Birch Road, Greenville, ST 35791',
        notes: 'Preferred contact: Text messages'
      },
      {
        name: 'Jennifer Martinez',
        email: 'j.martinez@email.com',
        phone: '(555) 789-0123',
        address: '258 Willow Street, Fairview, ST 46802'
      },
      {
        name: 'Christopher Lee',
        email: 'chris.lee@email.com',
        phone: '(555) 890-1234',
        address: '369 Spruce Avenue, Riverside, ST 57913',
        notes: 'Business owner'
      },
      {
        name: 'Amanda Garcia',
        email: 'amanda.garcia@email.com',
        phone: '(555) 901-2345',
        company: 'Garcia Solutions',
        address: '741 Aspen Court, Mountain View, ST 68024'
      },
      {
        name: 'Kevin Rodriguez',
        email: 'kevin.r@email.com',
        phone: '(555) 012-3456',
        company: 'Rodriguez Tech',
        address: '852 Redwood Drive, Valley City, ST 79135'
      },
      {
        name: 'Michelle Thompson',
        email: 'michelle.thompson@email.com',
        phone: '(555) 123-4567',
        company: 'Thompson Consulting',
        address: '963 Sequoia Lane, Forest Hills, ST 80246'
      },
      {
        name: 'Daniel White',
        email: 'daniel.white@email.com',
        phone: '(555) 234-5678',
        company: 'White Industries',
        address: '159 Cypress Street, Oceanview, ST 91357'
      },
      {
        name: 'Jessica Harris',
        email: 'jessica.harris@email.com',
        phone: '(555) 345-6789',
        company: 'Harris Marketing',
        address: '357 Magnolia Avenue, Sunset City, ST 02468'
      },
      {
        name: 'Ryan Clark',
        email: 'ryan.clark@email.com',
        phone: '(555) 456-7890',
        company: 'Clark Enterprises',
        address: '468 Dogwood Road, Riverside Park, ST 13579'
      },
      {
        name: 'Nicole Lewis',
        email: 'nicole.lewis@email.com',
        phone: '(555) 567-8901',
        company: 'Lewis Design Studio',
        address: '579 Hickory Drive, Garden City, ST 24680'
      },
      {
        name: 'Brandon Walker',
        email: 'brandon.walker@email.com',
        phone: '(555) 678-9012',
        company: 'Walker Construction',
        address: '680 Walnut Street, Hillside, ST 35791'
      },
      {
        name: 'Amanda White',
        email: 'amanda.white@email.com',
        phone: '(555) 901-2345',
        address: '741 Poplar Court, Westfield, ST 68024',
        notes: 'Frequent customer since 2020'
      },
      {
        name: 'Carlos Mendez',
        email: 'carlos.mendez@email.com',
        phone: '(555) 111-2222',
        company: 'Mendez Imports',
        address: '123 Commerce Street, Trade City, ST 11111',
        tags: 'VIP,Wholesale'
      },
      {
        name: 'Sofia Ramirez',
        email: 'sofia.ramirez@email.com',
        phone: '(555) 333-4444',
        address: '456 Residential Ave, Hometown, ST 22222',
        tags: 'Regular,Local'
      }
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
      // Clear cache to ensure fresh data is loaded
      dataCache.invalidateCache('customers');
      await loadCustomers();
      await loadAllCustomerIds(); // Refresh all customer IDs
    } catch (error: any) {
      console.error('Error eliminando cliente:', error);
      // Show error to user
      alert(error.message || 'Error al eliminar cliente. Porfavor intente de nuevo.');
    }
  };

  const handleSelectAll = (selectAll: boolean) => {
    // This function is called when the user clicks "select all"
    // The actual selection state is managed by the table component
    // We just need to ensure all customer IDs are available
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
                Add Mock Data
              </Button>
              <Button onClick={handleAddCustomer} disabled={!isElectron}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Cliente
              </Button>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        {isElectron ? (
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
        ) : (
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
              setViewingCustomer(undefined);
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