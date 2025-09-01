'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CalendarComponent } from '../../components/calendar/calendar-component';
import { EventDialog } from '../../components/calendar/event-dialog';
import { EventList } from '../../components/calendar/event-list';
import { CalendarSkeleton } from '@/components/skeletons/calendar-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataCache } from '@/hooks/use-data-cache';
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  RefreshCw,
  TrendingDown,
  Search,
  X
} from 'lucide-react';
import type { CalendarEvent, EventType, EventStatus } from '../../lib/calendar-types';
import type { Sale } from '@/lib/database-operations';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day
    return now;
  });
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    now.setDate(1); // Set to first day of month
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [loading, setLoading] = useState(false); // Start with false for optimistic navigation
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  
  // Use data cache for performance
  const dataCache = useDataCache();

  // Set isElectron after component mounts to avoid hydration mismatch
  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  const loadCalendarEvents = useCallback(async (forceRefresh = false) => {
    if (!isElectron) {
      setLoading(false);
      return;
    }

    try {
      // Check if we have cached sales data to avoid unnecessary loading states
      const cachedSales = dataCache.getCachedSales(1, 1000, '');
      const shouldShowLoading = (!cachedSales || forceRefresh) && events.length === 0;
      
      if (shouldShowLoading) {
        setLoading(true);
      }

      const calendarEvents: CalendarEvent[] = [];
      const errors: string[] = [];

      // Load sales events - try cache first
      let sales: Sale[];
      if (cachedSales && !forceRefresh && !dataCache.isSalesCacheExpired(1, 1000, '')) {
        sales = cachedSales.items;
      } else {
        try {
          sales = await window.electronAPI.database.sales.getAll();
          // Validate sales data
          if (!Array.isArray(sales)) {
            throw new Error('Invalid sales data format received');
          }
          
          // Cache the sales data for future use
          if (sales.length > 0) {
            dataCache.setCachedSales(1, 1000, '', {
              items: sales,
              total: sales.length,
              totalPages: 1,
              currentPage: 1,
              pageSize: 1000,
              searchTerm: '',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error('Error loading sales data:', error);
          errors.push('Failed to load sales data');
          sales = [];
        }
      }

      // Process sales events with validation
      sales.forEach((sale, index) => {
        try {
          // Validate required fields
          if (!sale.id || !sale.customer_name || !sale.date || !sale.total_amount) {
            console.warn(`Skipping invalid sale at index ${index}:`, sale);
            return;
          }

          const saleDate = new Date(sale.date);
          if (isNaN(saleDate.getTime())) {
            console.warn(`Invalid date for sale ${sale.id}:`, sale.date);
            return;
          }

          calendarEvents.push({
            id: `sale-${sale.id}`,
            title: `Venta: ${sale.customer_name}`,
            date: saleDate,
            type: 'sale',
            description: `Venta #${sale.sale_number || sale.id} - ${formatCurrency(sale.total_amount)}`,
            customerId: sale.customer_id,
            saleId: sale.id,
            amount: sale.total_amount,
            status: sale.payment_status === 'paid' ? 'completed' : 'pending'
          });
        } catch (error) {
          console.error(`Error processing sale ${sale.id}:`, error);
          errors.push(`Failed to process sale ${sale.id}`);
        }
      });

      // Load installment events with improved error handling
      const installmentPromises = sales
        .filter(sale => sale.payment_type === 'installments' && sale.id)
        .map(async (sale) => {
          try {
            const installments = await window.electronAPI.database.installments.getBySale(sale.id!);
            
            if (!Array.isArray(installments)) {
              console.warn(`Invalid installments data for sale ${sale.id}`);
              return [];
            }

            return installments
              .filter(installment => installment.id && installment.due_date && installment.amount)
              .map(installment => {
                try {
                  const dueDate = new Date(installment.due_date);
                  if (isNaN(dueDate.getTime())) {
                    console.warn(`Invalid due date for installment ${installment.id}:`, installment.due_date);
                    return null;
                  }

                  const isOverdue = dueDate < new Date() && installment.status !== 'paid';
                  const eventStatus: EventStatus = installment.status === 'paid' ? 'completed' : isOverdue ? 'overdue' : 'pending';
                  return {
                    id: `installment-${installment.id}`,
                    title: `Pago: ${sale.customer_name}`,
                    date: dueDate,
                    type: 'installment' as EventType,
                    description: `Cuota #${installment.installment_number || 'N/A'} - ${formatCurrency(installment.amount)}`,
                    customerId: sale.customer_id,
                    saleId: sale.id,
                    installmentId: installment.id,
                    amount: installment.amount,
                    status: eventStatus,
                    installmentNumber: installment.installment_number,
                    balance: installment.balance || 0
                  } as CalendarEvent;
                } catch (error) {
                  console.error(`Error processing installment ${installment.id}:`, error);
                  return null;
                }
              })
              .filter((item): item is CalendarEvent => item !== null); // Remove null entries
          } catch (error) {
            console.error(`Error loading installments for sale ${sale.id}:`, error);
            errors.push(`Failed to load installments for sale ${sale.id}`);
            return [];
          }
        });

      const installmentResults = await Promise.all(installmentPromises);
      const allInstallments = installmentResults.flat();
      calendarEvents.push(...allInstallments);

      // Sort events by date for better organization
      calendarEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

      setEvents(calendarEvents);
      setLastRefresh(Date.now());

      // Log any errors that occurred during data loading
      if (errors.length > 0) {
        console.warn('Calendar data synchronization completed with errors:', errors);
      }
    } catch (error) {
      console.error('Critical error loading calendar events:', error);
      // Don't clear existing events on error, just stop loading
    } finally {
      setLoading(false);
    }
  }, [isElectron, dataCache]);

  // Initial data load
  useEffect(() => {
    if (isElectron) {
      loadCalendarEvents();
    } else {
      setLoading(false);
    }
  }, [isElectron, loadCalendarEvents]);

  // Auto-refresh data every 5 minutes to keep calendar synchronized
  useEffect(() => {
    if (!isElectron) return;

    const interval = setInterval(() => {
      // Only refresh if the page is visible and not currently loading
      if (!document.hidden && !loading) {
        loadCalendarEvents();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isElectron, loading, loadCalendarEvents]);

  // Listen for visibility changes to refresh when user returns to tab
  useEffect(() => {
    if (!isElectron) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {
        // Refresh data when user returns to the tab after being away for more than 2 minutes
        const timeSinceLastRefresh = Date.now() - lastRefresh;
        if (timeSinceLastRefresh > 2 * 60 * 1000) {
          loadCalendarEvents();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
     return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
   }, [isElectron, loading, lastRefresh, loadCalendarEvents]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  // Bulk operation handlers
  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map(event => event.id));
    }
  };

  const handleEventSave = async (eventData: Partial<CalendarEvent>) => {
    // For custom events, we'll store them in local state
    // In a real application, this would integrate with your database
    console.log('Saving event:', eventData);
    
    // If it's a custom event, add it to our local events
    if (eventData.type === 'custom' || eventData.type === 'reminder') {
      // In a real app, you would save this to a database
      // For now, we'll just reload the events which will include the new one
      // if there was backend integration
    }
    
    // Invalidate cache and reload
    dataCache.invalidateCache('sales');
    await loadCalendarEvents(true);
    setIsEventDialogOpen(false);
  };

  const handleEventDelete = async (eventId: string) => {
    // For custom events, we'll remove them from local state
    // In a real application, this would integrate with your database
    console.log('Deleting event:', eventId);
    
    // If it's a custom event, remove it from our local events
    if (eventId.startsWith('custom-') || eventId.startsWith('reminder-')) {
      // In a real app, you would delete this from a database
      // For now, we'll just reload the events which will exclude the deleted one
      // if there was backend integration
    }
    
    // Invalidate cache and reload
    dataCache.invalidateCache('sales');
    await loadCalendarEvents(true);
    setIsEventDialogOpen(false);
  };

  const handleBulkExport = () => {
    const selectedEventData = filteredEvents.filter(event => selectedEvents.includes(event.id));
    const csvContent = [
      'Title,Date,Type,Status,Amount,Description',
      ...selectedEventData.map(event => 
        `"${event.title}","${event.date.toISOString().split('T')[0]}","${event.type}","${event.status}","${event.amount || 0}","${event.description || ''}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-events-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log(`Exported ${selectedEvents.length} events to CSV`);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Type filter
      if (filterType !== 'all' && event.type !== filterType) return false;
      
      // Status filter
      if (filterStatus !== 'all' && event.status !== filterStatus) return false;
      
      // Search filter
      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !event.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Date range filter
      if (dateRange.start && event.date < dateRange.start) return false;
      if (dateRange.end && event.date > dateRange.end) return false;
      
      return true;
    });
  }, [events, filterType, filterStatus, searchQuery, dateRange]);

  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(event =>
      event.date.toDateString() === selectedDate.toDateString()
    );
  }, [filteredEvents, selectedDate]);

  const monthEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      const eventMonth = event.date.getMonth();
      const eventYear = event.date.getFullYear();
      const currentMonthValue = currentMonth.getMonth();
      const currentYear = currentMonth.getFullYear();
      return eventMonth === currentMonthValue && eventYear === currentYear;
    });
  }, [filteredEvents, currentMonth]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      totalEvents: filteredEvents.length,
      salesEvents: filteredEvents.filter(e => e.type === 'sale').length,
      installmentEvents: filteredEvents.filter(e => e.type === 'installment').length,
      overdueEvents: filteredEvents.filter(e => e.status === 'overdue').length,
      completedEvents: filteredEvents.filter(e => e.status === 'completed').length,
      pendingEvents: filteredEvents.filter(e => e.status === 'pending').length,
      totalAmount: filteredEvents.reduce((sum, e) => sum + (e.amount || 0), 0),
      overdueAmount: filteredEvents.filter(e => e.status === 'overdue').reduce((sum, e) => sum + (e.amount || 0), 0)
    };
  }, [filteredEvents]);

  // Show skeleton only if loading and no cached data
  if (loading && events.length === 0) {
    return <CalendarSkeleton />;
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight" id="calendar-title">Calendario</h1>
              <p className="text-muted-foreground text-sm md:text-base" aria-describedby="calendar-title">
                Rastrea ventas, pagos de cuotas y fechas importantes del negocio
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8" role="region" aria-label="Calendar statistics">
          <Card className="transition-all hover:shadow-md" role="article" aria-labelledby="total-events-title">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium" id="total-events-title">Total de Eventos</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{stats.totalEvents}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                {stats.salesEvents} ventas, {stats.installmentEvents} pagos
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md" role="article" aria-labelledby="total-value-title">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium" id="total-value-title">Valor Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3 mr-1 text-green-500" />
                Ventas y pagos combinados
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md" role="article" aria-labelledby="overdue-payments-title">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium" id="overdue-payments-title">Pagos Vencidos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-red-600">{stats.overdueEvents}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                {formatCurrency(stats.overdueAmount)} vencidos
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md" role="article" aria-labelledby="completed-title">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium" id="completed-title">Completados</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-green-600">{stats.completedEvents}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                {stats.pendingEvents} aún pendientes
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6" role="region" aria-label="Calendar filters">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Filtros
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {filteredEvents.length} eventos
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {/* Search Section */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar eventos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>



            {/* Status Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" id="status-label">Estado</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                  className="text-xs h-6 px-2"
                >
                  Limpiar
                </Button>
              </div>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as EventStatus | 'all')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      Todos
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      Pendiente
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      Completado
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400"></div>
                      Vencido
                    </div>
                  </SelectItem>
                  <SelectItem value="cancelled">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                      Cancelado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {isElectron ? (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-3">
              <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Vista de Calendario
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {filteredEvents.length} eventos
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CalendarComponent
                    events={filteredEvents}
                    selectedDate={selectedDate}
                    currentMonth={currentMonth}
                    onDateSelect={handleDateSelect}
                    onEventClick={handleEventClick}
                    onMonthChange={setCurrentMonth}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="xl:col-span-1">
              <Card className="shadow-sm border-0 bg-gradient-to-br from-background to-muted/20 h-fit">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    Eventos para {selectedDate.toLocaleDateString()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <EventList
                    events={selectedDateEvents}
                    onEventClick={handleEventClick}
                    selectedEvents={selectedEvents}
                    onSelectEvent={handleSelectEvent}
                  />
                </CardContent>
              </Card>

              <Card className="mt-6 shadow-sm border-0 bg-gradient-to-br from-background to-muted/20">
                <CardHeader>
                  <CardTitle>Este Mes</CardTitle>
                  <CardDescription>
                    {monthEvents.length} evento{monthEvents.length !== 1 ? 's' : ''} en {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Ventas:</span>
                      <span>{monthEvents.filter(e => e.type === 'sale').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pagos:</span>
                      <span>{monthEvents.filter(e => e.type === 'installment').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Vencidos:</span>
                      <span className="text-red-600">{monthEvents.filter(e => e.status === 'overdue').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="shadow-lg border-0">
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                <CalendarIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Calendario No Disponible</h3>
              <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                La funcionalidad del calendario solo está disponible en la aplicación de escritorio Electron. 
                Por favor usa la versión de escritorio para acceder a las funciones del calendario.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar Página
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Event Dialog */}
        <EventDialog
          event={selectedEvent}
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
        />
      </div>
    </DashboardLayout>
  );
}