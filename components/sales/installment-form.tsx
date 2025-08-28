'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertCircle, Calendar as CalendarIcon, CreditCard, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Installment, Sale, Customer } from '@/lib/database-operations';

interface InstallmentFormProps {
  installment?: Installment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
}

export function InstallmentForm({ installment, open, onOpenChange, onSave }: InstallmentFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [formData, setFormData] = useState({
    sale_id: 0,
    installment_number: 1,
    due_date: new Date(),
    amount: 0,
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && typeof window !== 'undefined' && window.electronAPI) {
      loadData();
    }
  }, [open]);

  useEffect(() => {
    if (installment) {
      setFormData({
        sale_id: installment.sale_id,
        installment_number: installment.installment_number,
        due_date: new Date(installment.due_date),
        amount: installment.amount,
        notes: installment.notes || ''
      });
    } else {
      setFormData({
        sale_id: 0,
        installment_number: 1,
        due_date: new Date(),
        amount: 0,
        notes: ''
      });
    }
  }, [installment]);

  const loadData = async () => {
    try {
      const [customersData, salesData] = await Promise.all([
        window.electronAPI.database.customers.getAll(),
        window.electronAPI.database.sales.getAll()
      ]);
      
      setCustomers(customersData);
      setSales(salesData.filter(sale => sale.payment_type === 'installments'));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSaleSelect = (saleId: number) => {
    setFormData(prev => ({ ...prev, sale_id: saleId }));
    
    const selectedSale = sales.find(sale => sale.id === saleId);
    if (selectedSale && !installment) {
      const installmentAmount = selectedSale.installment_amount || 0;
      setFormData(prev => ({ ...prev, amount: installmentAmount }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.sale_id) {
      newErrors.sale_id = 'Selecciona una venta';
    }

    if (formData.installment_number < 1) {
      newErrors.installment_number = 'El número de cuota debe ser mayor a 0';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const installmentData = {
        sale_id: formData.sale_id,
        installment_number: formData.installment_number,
        due_date: formData.due_date.toISOString().split('T')[0],
        amount: formData.amount,
        paid_amount: 0,
        balance: formData.amount,
        status: 'pending' as const,
        days_overdue: 0,
        late_fee: 0,
        late_fee_applied: false,
        notes: formData.notes
      };

      if (installment?.id) {
        // Update existing installment - would need to implement update method
        console.log('Update installment:', installment.id, installmentData);
      } else {
        // Create new installment
        await window.electronAPI.database.installments.create(installmentData);
      }
      
      await onSave();
      
      setFormData({
        sale_id: 0,
        installment_number: 1,
        due_date: new Date(),
        amount: 0,
        notes: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Error saving installment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedSale = sales.find(sale => sale.id === formData.sale_id);
  const selectedCustomer = customers.find(customer => customer.id === selectedSale?.customer_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {installment ? 'Editar Cuota' : 'Nueva Cuota'}
          </DialogTitle>
          <DialogDescription>
            {installment ? 'Modificar los detalles de la cuota.' : 'Crear una nueva cuota para un plan de pagos.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            {/* Sale Selection */}
            <div className="space-y-2">
              <Label htmlFor="sale">Venta *</Label>
              <Select
                value={formData.sale_id.toString()}
                onValueChange={(value) => handleSaleSelect(parseInt(value))}
                disabled={!!installment}
              >
                <SelectTrigger className={errors.sale_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecciona una venta con cuotas" />
                </SelectTrigger>
                <SelectContent>
                  {sales.map((sale) => {
                    const customer = customers.find(c => c.id === sale.customer_id);
                    return (
                      <SelectItem key={sale.id} value={sale.id!.toString()}>
                        <div className="flex items-center gap-2">
                          <span>{sale.sale_number}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{customer?.name}</span>
                          <span className="text-muted-foreground">
                            ({sale.number_of_installments} cuotas)
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.sale_id && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.sale_id}
                </div>
              )}
              {selectedCustomer && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm font-medium">Cliente: {selectedCustomer.name}</div>
                  {selectedCustomer.email && (
                    <div className="text-xs text-muted-foreground">{selectedCustomer.email}</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Installment Number */}
              <div className="space-y-2">
                <Label htmlFor="installment_number">Número de Cuota *</Label>
                <Input
                  id="installment_number"
                  type="number"
                  min="1"
                  value={formData.installment_number}
                  onChange={(e) => handleInputChange('installment_number', parseInt(e.target.value) || 1)}
                  className={errors.installment_number ? 'border-red-500' : ''}
                />
                {errors.installment_number && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.installment_number}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount">Monto *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    className={`pl-10 ${errors.amount ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.amount && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.amount}
                  </div>
                )}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Fecha de Vencimiento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? (
                      format(formData.due_date, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => date && handleInputChange('due_date', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notas adicionales sobre esta cuota..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : installment ? 'Actualizar Cuota' : 'Crear Cuota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}