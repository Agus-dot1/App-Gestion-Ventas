'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar,
  DollarSign,
  User,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShoppingCart,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/lib/calendar-types';
import { getEventTypeColor, getEventStatusColor, formatEventTime } from '@/lib/calendar-types';

interface EventListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  bulkActionMode?: boolean;
  selectedEvents?: string[];
  onSelectEvent?: (eventId: string) => void;
}

export function EventList({ 
  events, 
  onEventClick, 
  bulkActionMode = false, 
  selectedEvents = [], 
  onSelectEvent 
}: EventListProps) {


  const [sortConfig, setSortConfig] = useState<{ key: keyof CalendarEvent; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'asc'
  });

  const sortedEvents = [...events].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    


    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
    


    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: keyof CalendarEvent) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="w-4 h-4" />;
      case 'installment':
        return <CreditCard className="w-4 h-4" />;
      case 'reminder':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="w-3 h-3 text-red-600" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-600" />;
      default:
        return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay eventos en esta fecha</p>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Sort Controls */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => requestSort('date')}
          className={cn(sortConfig.key === 'date' && 'bg-muted')}
        >
          <ArrowUpDown className="w-3 h-3 mr-1" />
          Fecha
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => requestSort('title')}
          className={cn(sortConfig.key === 'title' && 'bg-muted')}
        >
          <ArrowUpDown className="w-3 h-3 mr-1" />
          Título
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => requestSort('type')}
          className={cn(sortConfig.key === 'type' && 'bg-muted')}
        >
          <ArrowUpDown className="w-3 h-3 mr-1" />
          Tipo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => requestSort('status')}
          className={cn(sortConfig.key === 'status' && 'bg-muted')}
        >
          <ArrowUpDown className="w-3 h-3 mr-1" />
          Estado
        </Button>
      </div>

      {sortedEvents.map((event) => {
        const isSelected = selectedEvents.includes(event.id);
        
        return (
          <Card
            key={event.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border-l-4',
              event.type === 'sale' && 'border-l-green-500',
              event.type === 'installment' && 'border-l-blue-500',
              event.type === 'reminder' && 'border-l-yellow-500',
              event.status === 'overdue' && 'border-l-red-500',
              bulkActionMode && isSelected && 'ring-2 ring-primary bg-primary/5'
            )}
            onClick={(e) => {
              if (bulkActionMode && onSelectEvent) {
                e.preventDefault();
                onSelectEvent(event.id);
              } else {
                onEventClick(event);
              }
            }}
            role={bulkActionMode ? "checkbox" : "button"}
            aria-checked={bulkActionMode ? isSelected : undefined}
            aria-label={bulkActionMode 
              ? `${isSelected ? 'Deseleccionar' : 'Seleccionar'} evento: ${event.title}` 
              : `Ver detalles del evento: ${event.title}`
            }
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (bulkActionMode && onSelectEvent) {
                  onSelectEvent(event.id);
                } else {
                  onEventClick(event);
                }
              }
            }}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Event Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {bulkActionMode && onSelectEvent && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onSelectEvent(event.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} evento: ${event.title}`}
                      />
                    )}
                    <span aria-hidden="true">{getEventIcon(event.type)}</span>
                    <div>
                      <h4 className="font-medium text-sm" id={`event-title-${event.id}`}>{event.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {formatEventTime(event.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span aria-hidden="true">{getStatusIcon(event.status)}</span>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getEventStatusColor(event.status))}
                      aria-label={`Estado del evento: ${event.status === 'completed' ? 'Completado' : event.status === 'pending' ? 'Pendiente' : event.status === 'overdue' ? 'Vencido' : event.status}`}
                    >
                      {event.status === 'completed' ? 'Completado' : event.status === 'pending' ? 'Pendiente' : event.status === 'overdue' ? 'Vencido' : event.status}
                    </Badge>
                  </div>
                </div>

              {/* Event Details */}
              {event.description && (
                <p className="text-xs text-muted-foreground" aria-describedby={`event-title-${event.id}`}>
                  {event.description}
                </p>
              )}

              {/* Financial Information */}
              {event.amount && (
                <div className="flex items-center justify-between text-xs" role="region" aria-labelledby={`financial-info-${event.id}`}>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span className="font-medium" id={`financial-info-${event.id}`} aria-label={`Monto: ${formatCurrency(event.amount)}`}>{formatCurrency(event.amount)}</span>
                  </div>
                  {event.balance && event.balance > 0 && (
                    <div className="text-red-600" aria-label={`Saldo pendiente: ${formatCurrency(event.balance)}`}>
                      Saldo: {formatCurrency(event.balance)}
                    </div>
                  )}
                </div>
              )}

              {/* Installment Information */}
              {event.type === 'installment' && event.installmentNumber && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CreditCard className="w-3 h-3" />
                  <span>Cuota #{event.installmentNumber}</span>
                </div>
              )}

              {/* Customer Information */}
              {event.customerName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground" role="region" aria-labelledby={`customer-info-${event.id}`}>
                  <User className="w-3 h-3" aria-hidden="true" />
                  <span id={`customer-info-${event.id}`} aria-label={`Cliente: ${event.customerName}`}>{event.customerName}</span>
                </div>
              )}

              {/* Event Type Badge */}
              <div className="flex justify-end">
                <Badge
                  variant="outline"
                  className={cn('text-xs', getEventTypeColor(event.type))}
                  aria-label={`Tipo de evento: ${event.type === 'sale' ? 'Venta' : event.type === 'installment' ? 'Cuota' : event.type === 'reminder' ? 'Recordatorio' : event.type.charAt(0).toUpperCase() + event.type.slice(1)}`}
                >
                  {event.type === 'sale' ? 'Venta' : event.type === 'installment' ? 'Cuota' : event.type === 'reminder' ? 'Recordatorio' : event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}