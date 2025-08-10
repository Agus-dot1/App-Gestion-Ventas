'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Edit, Trash2, Users, Phone, Calendar, Loader2 } from 'lucide-react';
import type { Customer, Sale } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

interface CustomersTableProps {
  customers: Customer[];
  highlightId?: string | null;
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: number) => void;
}

export function CustomersTable({ customers, highlightId, onEdit, onDelete }: CustomersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [relatedSales, setRelatedSales] = useState<Sale[]>([]);
  const [isFetchingSales, setIsFetchingSales] = useState(false);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contact_info?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchRelatedSales = async (customerId: number) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        setIsFetchingSales(true);
        const sales = await window.electronAPI.database.sales.getByCustomer(customerId);
        setRelatedSales(sales);
      } catch (error) {
        console.error('Error fetching related sales:', error);
        setRelatedSales([]);
      } finally {
        setIsFetchingSales(false);
      }
    }
  };

  const handleDeleteClick = async (customer: Customer) => {
    setDeleteCustomer(customer);
    await fetchRelatedSales(customer.id!);
  };

  const handleDelete = async () => {
    if (deleteCustomer?.id) {
      await onDelete(deleteCustomer.id);
      setDeleteCustomer(null);
      setRelatedSales([]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customers
              </CardTitle>
              <CardDescription>
                Manage your customer database and contact information
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No customers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No customers match your search criteria.' : 'Get started by adding your first customer.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact Information</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow 
                      key={customer.id} 
                      id={`customer-${customer.id}`}
                      className={cn(
                        highlightId === customer.id?.toString() && 'bg-muted/50'
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          {customer.name}
                          {highlightId === customer.id?.toString() && (
                            <Badge variant="outline" className="bg-primary/10 text-primary">
                              Found
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {customer.contact_info ? (
                          <div className="flex items-start gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="truncate text-sm">
                              {customer.contact_info}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-sm">No contact info</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {customer.created_at ? formatDate(customer.created_at) : 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(customer)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCustomer} onOpenChange={(open) => {
        if (!open) {
          setDeleteCustomer(null);
          setRelatedSales([]);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              {isFetchingSales ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading related sales...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <p>
                    Are you sure you want to delete "{deleteCustomer?.name}"?
                    This action cannot be undone.
                  </p>
                  {relatedSales.length > 0 ? (
                    <div className="border rounded-md p-4 bg-muted/50">
                      <h4 className="font-medium mb-2">The following movements will also be deleted:</h4>
                      <div className="max-h-40 overflow-y-auto">
                        <ul className="space-y-2">
                          {relatedSales.map((sale) => (
                            <li key={sale.id} className="flex justify-between text-sm">
                              <span>Sale #{sale.sale_number}</span>
                              <span className="font-medium">{formatCurrency(sale.total_amount)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Total: {relatedSales.length} sale{relatedSales.length !== 1 ? 's' : ''} ({formatCurrency(relatedSales.reduce((sum, sale) => sum + sale.total_amount, 0))})
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No related sales found for this customer.</p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-slate-50"
              disabled={isFetchingSales}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}