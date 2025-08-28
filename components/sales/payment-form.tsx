'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, DollarSign, CreditCard, Calendar } from 'lucide-react';
import type { Installment } from '@/lib/database-operations';

interface PaymentFormProps {
  installment?: Installment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (paymentData: {
    amount: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
}

export function PaymentForm({ installment, open, onOpenChange, onSave }: PaymentFormProps) {
  const [formData, setFormData] = useState({
    amount: 0,
    paymentMethod: 'cash',
    reference: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (installment) {
      setFormData({
        amount: installment.balance,
        paymentMethod: 'cash',
        reference: '',
        notes: ''
      });
    }
  }, [installment]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (installment && formData.amount > installment.balance) {
      newErrors.amount = `El monto no puede ser mayor al balance (${formatCurrency(installment.balance)})`;
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Selecciona un método de pago';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined
      });
      
      setFormData({
        amount: 0,
        paymentMethod: 'cash',
        reference: '',
        notes: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Error recording payment:', error);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!installment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Registrar un pago para la cuota #{installment.installment_number}
          </DialogDescription>
        </DialogHeader>

        {/* Installment Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información de la Cuota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cuota:</span>
              <span className="font-medium">#{installment.installment_number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Vencimiento:</span>
              <span className="font-medium">{formatDate(installment.due_date)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Monto Total:</span>
              <span className="font-medium">{formatCurrency(installment.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Ya Pagado:</span>
              <span className="font-medium">{formatCurrency(installment.paid_amount)}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span>Balance Pendiente:</span>
              <span className="font-bold text-lg">{formatCurrency(installment.balance)}</span>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4">
            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Monto del Pago *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={installment.balance}
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputChange('amount', installment.balance)}
                >
                  Pago Completo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputChange('amount', installment.balance / 2)}
                >
                  50%
                </Button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pago *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleInputChange('paymentMethod', value)}
              >
                <SelectTrigger className={errors.paymentMethod ? 'border-red-500' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                  <SelectItem value="debit_card">Tarjeta de Débito</SelectItem>
                  <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethod && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.paymentMethod}
                </div>
              )}
            </div>

            {/* Payment Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Referencia del Pago</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="Número de transacción, cheque, etc."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Notas adicionales sobre este pago..."
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
              {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}