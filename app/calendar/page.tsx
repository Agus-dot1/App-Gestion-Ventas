'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CalendarComponent } from '../../components/calendar/calendar-component';
import { EventDialog } from '../../components/calendar/event-dialog';
import { EventList } from '../../components/calendar/event-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TrendingUp
} from 'lucide-react';
import type { CalendarEvent, EventType, EventStatus } from '../../lib/calendar-types';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
    if (typeof window !== 'undefined' && window.electronAPI) {
      loadCalendarEvents();
    } else {
      setLoading(false);
    }
  }, []);

  const loadCalendarEvents = async () => {
    setLoading(true);
    try {
      const calendarEvents: CalendarEvent[] = [];

      // Load sales events
      const sales = await window.electronAPI.database.sales.getAll();
      sales.forEach(sale => {
        calendarEvents.push({
          id: `sale-${sale.id}`,
          title: `Sale: ${sale.customer_name}`,
          date: new Date(sale.date),
          type: 'sale',
          description: `Sale #${sale.sale_number} - ${formatCurrency(sale.total_amount)}`,
          customerId: sale.customer_id,
          saleId: sale.id,
          amount: sale.total_amount,
          status: sale.payment_status === 'paid' ? 'completed' : 'pending'
        });
      });

      // Load installment events
      for (const sale of sales) {
        if (sale.payment_type === 'installments') {
          const installments = await window.electronAPI.database.installments.getBySale(sale.id!);
          installments.forEach(installment => {
            const isOverdue = new Date(installment.due_date) < new Date() && installment.status !== 'paid';
            calendarEvents.push({
              id: `installment-${installment.id}`,
              title: `Payment: ${sale.customer_name}`,
              date: new Date(installment.due_date),
              type: 'installment',
              description: `Installment #${installment.installment_number} - ${formatCurrency(installment.amount)}`,
              customerId: sale.customer_id,
              saleId: sale.id,
              installmentId: installment.id,
              amount: installment.amount,
              status: installment.status === 'paid' ? 'completed' : isOverdue ? 'overdue' : 'pending',
              installmentNumber: installment.installment_number,
              balance: installment.balance
            });
          });
        }
      }

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleAddEvent = () => {
    setSelectedEvent(null);
    setIsEventDialogOpen(true);
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
    
    await loadCalendarEvents();
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
    
    await loadCalendarEvents();
    setIsEventDialogOpen(false);
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 animate-pulse" />
            <span>Loading calendar events...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
              <p className="text-muted-foreground">
                Track sales, installment payments, and important business dates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadCalendarEvents}>
                <CalendarIcon className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="w-40"
                />
                <Button onClick={handleAddEvent}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-blue-500" />
                {stats.salesEvents} sales, {stats.installmentEvents} payments
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3 mr-1 text-green-500" />
                Combined sales and payments
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdueEvents}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                {formatCurrency(stats.overdueAmount)} overdue
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedEvents}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                {stats.pendingEvents} still pending
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Tabs value={filterType} onValueChange={(value) => setFilterType(value as EventType | 'all')}>
            <TabsList>
              <TabsTrigger value="all">All Events ({stats.totalEvents})</TabsTrigger>
              <TabsTrigger value="sale">Sales ({stats.salesEvents})</TabsTrigger>
              <TabsTrigger value="installment">Payments ({stats.installmentEvents})</TabsTrigger>
              <TabsTrigger value="reminder">Reminders</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as EventStatus | 'all')}>
            <TabsList>
              <TabsTrigger value="all">All Status</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isElectron ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar Component */}
            <div className="lg:col-span-2">
              <CalendarComponent
                events={filteredEvents}
                selectedDate={selectedDate}
                currentMonth={currentMonth}
                onDateSelect={handleDateSelect}
                onMonthChange={setCurrentMonth}
                onEventClick={handleEventClick}
              />
            </div>

            {/* Event List Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardTitle>
                  <CardDescription>
                    {selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''} on this date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EventList
                    events={selectedDateEvents}
                    onEventClick={handleEventClick}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>This Month</CardTitle>
                  <CardDescription>
                    {monthEvents.length} event{monthEvents.length !== 1 ? 's' : ''} in {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sales:</span>
                      <span>{monthEvents.filter(e => e.type === 'sale').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Payments:</span>
                      <span>{monthEvents.filter(e => e.type === 'installment').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Overdue:</span>
                      <span className="text-red-600">{monthEvents.filter(e => e.status === 'overdue').length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Electron Required</h3>
                <p className="text-muted-foreground">
                  Calendar functionality is only available in the Electron desktop app.
                </p>
              </div>
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