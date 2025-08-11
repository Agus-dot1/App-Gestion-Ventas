'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Users, Phone, Mail, MapPin, User } from 'lucide-react';
import type { Customer } from '@/lib/database-operations';

interface CustomerFormProps {
  customer?: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Omit<Customer, 'id' | 'created_at'>) => void;
}

export function CustomerForm({ customer, open, onOpenChange, onSave }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse existing contact_info when editing
  useState(() => {
    if (customer?.contact_info) {
      const contactLines = customer.contact_info.split('\n');
      const parsed = {
        phone: '',
        email: '',
        address: '',
        notes: ''
      };

      contactLines.forEach(line => {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('teléfono:') || lowerLine.includes('tel:')) {
          parsed.phone = line.replace(/^(phone:|tel:)\s*/i, '').trim();
        } else if (lowerLine.includes('email:') || lowerLine.includes('@')) {
          parsed.email = line.replace(/^email:\s*/i, '').trim();
        } else if (lowerLine.includes('dirección:')) {
          parsed.address = line.replace(/^address:\s*/i, '').trim();
        } else if (line.trim()) {
          parsed.notes += (parsed.notes ? '\n' : '') + line.trim();
        }
      });

      setFormData(prev => ({
        ...prev,
        ...parsed
      }));
    }
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del cliente es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
        contact_info: buildContactInfo()
      });
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
      });
      setErrors({});
      onOpenChange(false);
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