'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Users, Phone, Mail, MapPin, User, Building, Tag, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/database-operations';

type PaymentWindow = '1 to 10' | '10 to 20' | '20 to 30';

interface CustomerFormState {
  name: string;
  dni: string;
  phone: string;
  secondary_phone: string;
  address: string;
  notes: string;
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
    secondary_phone: customer?.secondary_phone || '',
    address: customer?.address || '',
    notes: customer?.notes || '',
    payment_window: customer?.payment_window ?? undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExcelLayout, setIsExcelLayout] = useState(false);



  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        dni: customer.dni || '',
        phone: customer.phone || '',
        secondary_phone: customer.secondary_phone || '',
        address: customer.address || '',
        notes: customer.notes || '',
        payment_window: customer.payment_window ?? undefined
      });
    } else {
      setFormData({
        name: '',
        dni: '',
        phone: '',
        secondary_phone: '',
        address: '',  
        notes: '',
        payment_window: undefined
      });
    }
  }, [customer]);



  useEffect(() => {
    try {
      const saved = localStorage.getItem('excelFormLayout');
      setIsExcelLayout(saved === 'true');
    } catch {}

    const handler = (e: any) => {
      const detail = e?.detail || {};
      if (Object.prototype.hasOwnProperty.call(detail, 'excelFormLayout')) {
        setIsExcelLayout(Boolean(detail.excelFormLayout));
      }
    };
    window.addEventListener('app:settings-changed', handler);
    return () => window.removeEventListener('app:settings-changed', handler);
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del cliente es obligatorio';
    }



    if (formData.dni.trim()) {
      const dniRegex = /^\d{7,8}$/; // 7 or 8 digits for Argentine DNI
      if (!dniRegex.test(formData.dni.trim())) {
        newErrors.dni = 'El DNI debe tener 7 u 8 dígitos';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };



  const buildContactInfo = () => {
    const contactParts = [];
    
    if (formData.phone.trim()) {
      contactParts.push(`Teléfono: ${formData.phone.trim()}`);
    }
    if (formData.secondary_phone.trim()) {
      contactParts.push(`Teléfono secundario: ${formData.secondary_phone.trim()}`);
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
        phone: formData.phone.trim() || undefined,
        secondary_phone: formData.secondary_phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        payment_window: formData.payment_window,
        contact_info: buildContactInfo() // Keep for backward compatibility
      });
      


      setFormData({
        name: '',
        dni: '',
        phone: '',
        secondary_phone: '',
        address: '',
        notes: '',
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


    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePaymentWindowChange = (value: PaymentWindow) => {
    setFormData(prev => ({ ...prev, payment_window: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'max-w-[95vw] max-h-[90vh] short:max-h-[80vh] overflow-y-auto',
        isExcelLayout ? 'sm:max-w-[98vw] lg:max-w-[80vw] xl:max-w-[70vw]' : 'sm:max-w-[500px]'
      )}>
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
          {isExcelLayout ? (
            <div className="grid gap-3 md:grid-cols-6">
              {/* DNI */}
              <div className="md:col-span-1 space-y-1">
                <Label htmlFor="dni" className="text-xs">DNI</Label>
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
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.dni}
                  </div>
                )}
              </div>

              {/* Nombre */}
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="name" className="text-xs">Nombre *</Label>
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
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </div>
                )}
              </div>

              {/* Teléfono */}
              <div className="md:col-span-1 space-y-1">
                <Label htmlFor="phone" className="text-xs">Teléfono</Label>
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

              {/* Teléfono secundario */}
              <div className="md:col-span-1 space-y-1">
                <Label htmlFor="secondary_phone" className="text-xs">Teléfono secundario</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="secondary_phone"
                    type="tel"
                    value={formData.secondary_phone}
                    onChange={(e) => handleInputChange('secondary_phone', e.target.value)}
                    placeholder="(555) 987-6543"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="md:col-span-1 space-y-1">
                <Label htmlFor="address" className="text-xs">Dirección</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Calle 123, Ciudad, CP"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="md:col-span-6 space-y-1">
                <Label htmlFor="notes" className="text-xs">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Cualquier información adicional..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
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

                  {/* Secondary Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="secondary_phone">Telefono secundario</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="secondary_phone"
                        type="tel"
                        value={formData.secondary_phone}
                        onChange={(e) => handleInputChange('secondary_phone', e.target.value)}
                        placeholder="(555) 987-6543"
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
          )}

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