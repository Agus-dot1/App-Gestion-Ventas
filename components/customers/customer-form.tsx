'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Users, Phone, Mail, MapPin, User, Building, Tag, CreditCard } from 'lucide-react';
import type { Customer } from '@/lib/database-operations';

type PaymentWindow = '1 to 10' | '20 to 30';

interface CustomerFormState {
  name: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  tags: string;
  payment_window?: PaymentWindow;
}

interface CustomerFormProps {
  customer?: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => void;
}

export function CustomerForm({ customer, open, onOpenChange, onSave }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormState>({
    name: customer?.name || '',
    dni: customer?.dni || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
    tags: customer?.tags || '',
    payment_window: customer?.payment_window ?? undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when customer prop changes
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        dni: customer.dni || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        notes: customer.notes || '',
        tags: customer.tags || '',
        payment_window: customer.payment_window ?? undefined
      });
    } else {
      setFormData({
        name: '',
        dni: '',
        phone: '',
        email: '',
        address: '',  
        notes: '',
        tags: '',
        payment_window: undefined
      });
    }
  }, [customer]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del cliente es obligatorio';
    }

    // DNI validation - optional but if provided, should be valid
    if (formData.dni.trim()) {
      const dniRegex = /^\d{7,8}$/; // 7 or 8 digits for Argentine DNI
      if (!dniRegex.test(formData.dni.trim())) {
        newErrors.dni = 'El DNI debe tener 7 u 8 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Build backward-compatible contact_info for legacy support
  const buildContactInfo = () => {
    const contactParts = [];
    
    if (formData.phone.trim()) {
      contactParts.push(`Teléfono: ${formData.phone.trim()}`);
    }
    if (formData.email.trim()) {
      contactParts.push(`Email: ${formData.email.trim()}`);
    }
    if (formData.address.trim()) {
      contactParts.push(`Dirección: ${formData.address.trim()}`);
    }
    if (formData.notes.trim()) {
      contactParts.push(formData.notes.trim());
    }
    
    return contactParts.join('\n') || undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave({
        name: formData.name.trim(),
        dni: formData.dni.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        tags: formData.tags.trim() || undefined,
        payment_window: formData.payment_window,
        contact_info: buildContactInfo() // Keep for backward compatibility
      });
      
      // Reset form - parent component will handle closing
      setFormData({
        name: '',
        dni: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        tags: '',
        payment_window: undefined
      });
      setErrors({});
    } catch (error) {
      console.error('Error guardando cambios:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePaymentWindowChange = (value: PaymentWindow) => {
    setFormData(prev => ({ ...prev, payment_window: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {customer ? 'Editar cliente' : 'Añadir cliente'}
          </DialogTitle>
          <DialogDescription>
            {customer ? 'Actualizar cliente' : 'Crear un nuevo cliente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6">
            {/* DNI Field - First field */}
            <div className="space-y-2">
              <Label htmlFor="dni">DNI</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => handleInputChange('dni', e.target.value)}
                  placeholder="12345678"
                  className={`pl-10 ${errors.dni ? 'border-red-500' : ''}`}
                  maxLength={8}
                />
              </div>
              {errors.dni && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.dni}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Documento Nacional de Identidad (7 u 8 dígitos)
              </p>
            </div>

            {/* Customer Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nombre del cliente"
                  className={`pl-10 ${errors.name ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.name && (
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </div>
              )}
            </div>

            {/* Contact Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">Información de contacto</Label>
                <span className="text-sm text-muted-foreground">(Todo opcional)</span>
              </div>
              
              <div className="grid gap-4 pl-6 border-l-2 border-muted">
                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Numero de teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="cliente@ejemplo.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Calle 123, Ciudad, CP"
                      rows={2}
                      className="pl-10"
                    />
                  </div>
                </div>


                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Etiquetas</Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="tags"
                      value={formData.tags}
                      onChange={(e) => handleInputChange('tags', e.target.value)}
                      placeholder="VIP, Mayorista, Frecuente (separadas por comas)"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Payment Window */}
                <div className="space-y-2">
                  <Label htmlFor="payment_window">Ventana de pago</Label>
                  <Select
                    value={formData.payment_window ?? ''}
                    onValueChange={(value) => handlePaymentWindowChange(value as PaymentWindow)}
                  >
                    <SelectTrigger id="payment_window">
                      <SelectValue placeholder="Selecciona una ventana" />
                    </SelectTrigger>
                    <SelectContent>
        <SelectItem value="1 to 10">1 al 10</SelectItem>
        <SelectItem value="20 to 30">20 al 30</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define el rango de días del mes en el que suele pagar.
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Nota adicional</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Cualquier informacion adicional..."
                    rows={3}
                  />
                </div>
              </div>
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
              {isSubmitting ? 'Guardando...' : customer ? 'Actualizar cliente' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}