'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CustomerForm } from '@/components/customers/customer-form';
import { CustomersTable } from '@/components/customers/customers-table';
import { Plus, Users, TrendingUp, Calendar, Database } from 'lucide-react';
import type { Customer } from '@/lib/database-operations';

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    if (typeof window !== 'undefined' && window.electronAPI) {
      loadCustomers();
    }
  }, []);

  // Highlight customer if specified in URL
  const highlightedCustomer = useMemo(() => {
    if (!highlightId) return null;
    return customers.find(customer => customer.id?.toString() === highlightId);
  }, [customers, highlightId]);

  useEffect(() => {
    if (highlightedCustomer) {
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
  const loadCustomers = async () => {
    try {
      const allCustomers = await window.electronAPI.database.customers.getAll();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'created_at'>) => {
    try {
      if (editingCustomer?.id) {
        // Update existing customer
        window.electronAPI.database.customers.update(editingCustomer.id, customerData);
      } else {
        // Create new customer
        window.electronAPI.database.customers.create(customerData);
      }
      
      await loadCustomers();
      setEditingCustomer(undefined);
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const addMockCustomers = async () => {
    const mockCustomers = [
      {
        name: 'John Smith',
        contact_info: 'Phone: (555) 123-4567\nEmail: john.smith@email.com\nAddress: 123 Main St, Anytown, ST 12345\nPreferred contact method: Email'
      },
      {
        name: 'Sarah Johnson',
        contact_info: 'Phone: (555) 987-6543\nEmail: sarah.j@email.com\nAddress: 456 Oak Avenue, Springfield, ST 67890'
      },
      {
        name: 'Michael Brown',
        contact_info: 'Phone: (555) 456-7890\nAddress: 789 Pine Street, Riverside, ST 54321\nBest time to call: Evenings'
      },
      {
        name: 'Emily Davis',
        contact_info: 'Email: emily.davis@email.com\nPhone: (555) 234-5678\nAddress: 321 Elm Drive, Lakeside, ST 98765'
      },
      {
        name: 'David Wilson',
        contact_info: 'Phone: (555) 345-6789\nEmail: d.wilson@email.com\nAddress: 654 Maple Drive, Hilltown, ST 13579\nCompany: Wilson Enterprises'
      },
      {
        name: 'Lisa Anderson',
        contact_info: 'Phone: (555) 567-8901\nEmail: lisa.anderson@email.com\nAddress: 987 Cedar Lane, Brookfield, ST 24680'
      },
      {
        name: 'Robert Taylor',
        contact_info: 'Phone: (555) 678-9012\nAddress: 147 Birch Road, Greenville, ST 35791\nPreferred contact: Text messages'
      },
      {
        name: 'Jennifer Martinez',
        contact_info: 'Email: j.martinez@email.com\nPhone: (555) 789-0123\nAddress: 258 Willow Street, Fairview, ST 46802'
      },
      {
        name: 'Christopher Lee',
        contact_info: 'Phone: (555) 890-1234\nEmail: chris.lee@email.com\nAddress: 369 Spruce Avenue, Riverside, ST 57913\nBusiness owner'
      },
      {
        name: 'Amanda White',
        contact_info: 'Phone: (555) 901-2345\nEmail: amanda.white@email.com\nAddress: 741 Poplar Court, Westfield, ST 68024\nFrequent customer since 2020'
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

  const handleDeleteCustomer = async (customerId: number) => {
    try {
      window.electronAPI.database.customers.delete(customerId);
      await loadCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      // Show error to user
      alert(error.message || 'Failed to delete customer. Please try again.');
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
              <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
              <p className="text-muted-foreground">
                Manage your customer database and contact information
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
                Add Customer
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Users className="h-3 w-3 mr-1 text-blue-500" />
                Registered customers
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">With Contact Info</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withContact}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                Have contact details
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Missing Contact</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withoutContact}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Users className="h-3 w-3 mr-1 text-orange-500" />
                Need contact info
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recently Added</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentlyAdded}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1 text-purple-500" />
                Last 30 days
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customers Table */}
        {isElectron ? (
          <CustomersTable
            customers={customers}
            highlightId={highlightId}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
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
      </div>
    </DashboardLayout>
  );
}