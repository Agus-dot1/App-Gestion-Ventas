'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  User, 
  DollarSign, 
  CreditCard, 
  ShoppingCart, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Edit,
  Trash2,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent, EventType, EventStatus } from '@/lib/calendar-types';
import { getEventTypeColor, getEventStatusColor } from '@/lib/calendar-types';

interface EventDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
}

export function EventDialog({ event, open, onOpenChange, onSave, onDelete }: EventDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'custom' as EventType,
    status: 'pending' as EventStatus,
    notes: '',
    date: new Date()
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        type: event.type,
        status: event.status,
        notes: event.notes || '',
        date: event.date || new Date()
      });
      setIsEditing(false);
    } else {
      // New event
      setFormData({
        title: '',
        description: '',
        type: 'custom',
        status: 'pending',
        notes: '',
        date: new Date()
      });
      setIsEditing(true);
    }
  }, [event]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const handleSave = () => {
    onSave({
      ...formData,
      id: event?.id || `custom-${Date.now()}`,
      date: formData.date
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (event?.id) {
      onDelete(event.id);
    }
  };

  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="w-5 h-5" />;
      case 'installment':
        return <CreditCard className="w-5 h-5" />;
      case 'reminder':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Calendar className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: EventStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const canEdit = true; // Allow editing all event types
  const canDelete = !event || event.type === 'custom' || event.type === 'reminder';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {event ? getEventIcon(event.type) : <Calendar className="w-5 h-5" />}
            {event ? (isEditing ? 'Edit Event' : 'Event Details') : 'Create New Event'}
          </DialogTitle>
          <DialogDescription>
            {event ? 
              `${event.type.charAt(0).toUpperCase() + event.type.slice(1)} event on ${formatDate(event.date)}` :
              'Create a new custom event or reminder'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {event && !isEditing ? (
            // View Mode
            <div className="space-y-6">
              {/* Event Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getEventIcon(event.type)}
                      <div>
                        <CardTitle className="text-lg">{event.title}</CardTitle>
                        <CardDescription>{formatDate(event.date)}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(event.status)}
                      <Badge className={cn(getEventStatusColor(event.status))}>
                        {event.status}
                      </Badge>
                      <Badge variant="outline" className={cn(getEventTypeColor(event.type))}>
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                {event.description && (
                  <CardContent>
                    <p className="text-muted-foreground">{event.description}</p>
                  </CardContent>
                )}
              </Card>

              {/* Financial Information */}
              {(event.amount || event.balance) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <DollarSign className="w-4 h-4" />
                      Financial Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {event.amount && (
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">{formatCurrency(event.amount)}</span>
                      </div>
                    )}
                    {event.balance && event.balance > 0 && (
                      <div className="flex justify-between">
                        <span>Outstanding Balance:</span>
                        <span className="font-medium text-red-600">{formatCurrency(event.balance)}</span>
                      </div>
                    )}
                    {event.installmentNumber && (
                      <div className="flex justify-between">
                        <span>Número de Cuota:</span>
                        <span className="font-medium">#{event.installmentNumber}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Customer Information */}
              {event.customerName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="w-4 h-4" />
                      Información del Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Cliente:</span>
                      <span className="font-medium">{event.customerName}</span>
                    </div>
                    
                    {/* Customer Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4 mr-1" />
                        Llamar
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="w-4 h-4 mr-1" />
                        Correo
                      </Button>
                      <Button size="sm" variant="outline">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        SMS
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Notes */}
              {event.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">{event.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // Edit/Create Mode
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título del Evento *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ingrese el título del evento"
                    disabled={!!(event && (event.type === 'sale' || event.type === 'installment'))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Evento</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: EventType) => setFormData(prev => ({ ...prev, type: value }))}
                    disabled={!!(event && (event.type === 'sale' || event.type === 'installment'))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Evento Personalizado</SelectItem>
                      <SelectItem value="reminder">Recordatorio</SelectItem>
                      {event && event.type === 'sale' && <SelectItem value="sale">Venta</SelectItem>}
                      {event && event.type === 'installment' && <SelectItem value="installment">Cuota</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date and Time - always show for editable events */}
              <div className="space-y-2">
                <Label htmlFor="date">Fecha y Hora</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={format(formData.date, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: new Date(e.target.value) }))}
                  disabled={!!(event && (event.type === 'sale' || event.type === 'installment'))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Breve descripción del evento"
                  disabled={!!(event && (event.type === 'sale' || event.type === 'installment'))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: EventStatus) => setFormData(prev => ({ ...prev, status: value }))}
                  disabled={!!(event && (event.type === 'sale' || event.type === 'installment'))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    {formData.type === 'installment' && (
                      <SelectItem value="overdue">Vencido</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Cualquier nota o detalle adicional..."
                  rows={3}
                  disabled={!!(event && (event.type === 'sale' || event.type === 'installment'))}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              {event && canDelete && !isEditing && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (isEditing && event) {
                    setIsEditing(false);
                  } else {
                    onOpenChange(false);
                  }
                }}
              >
                Cancelar
              </Button>
              
              {event && !isEditing && canEdit && (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
              
              {(isEditing || !event) && (
                <Button onClick={handleSave} disabled={!formData.title.trim()}>
                  {event ? 'Guardar Cambios' : 'Crear Evento'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}