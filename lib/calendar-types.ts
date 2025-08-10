// Calendar types and interfaces for the calendar system

export type EventType = 'sale' | 'installment' | 'reminder' | 'custom';
export type EventStatus = 'pending' | 'completed' | 'overdue' | 'cancelled';

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: EventType;
  description?: string;
  status: EventStatus;
  
  // Customer and sale information
  customerId?: number;
  customerName?: string;
  saleId?: number;
  installmentId?: number;
  
  // Financial information
  amount?: number;
  balance?: number;
  installmentNumber?: number;
  
  // Additional metadata
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface CalendarMonth {
  year: number;
  month: number;
  weeks: CalendarWeek[];
}

// Utility functions for calendar operations
export const isSameDay = (date1: Date, date2: Date, timeZone?: string): boolean => {
  if (!timeZone) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
  
  // For time zone-aware comparison, we need to convert both dates to the same time zone
  const d1 = new Date(date1.toLocaleString("en-US", {timeZone}));
  const d2 = new Date(date2.toLocaleString("en-US", {timeZone}));
  
  return d1.getDate() === d2.getDate() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getFullYear() === d2.getFullYear();
};

export const isSameMonth = (date1: Date, date2: Date, timeZone?: string): boolean => {
  if (!timeZone) {
    return date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  }
  
  // For time zone-aware comparison, we need to convert both dates to the same time zone
  const d1 = new Date(date1.toLocaleString("en-US", {timeZone}));
  const d2 = new Date(date2.toLocaleString("en-US", {timeZone}));
  
  return d1.getMonth() === d2.getMonth() &&
         d1.getFullYear() === d2.getFullYear();
};

export const isToday = (date: Date, timeZone?: string): boolean => {
  return isSameDay(date, new Date(), timeZone);
};

export const getMonthName = (month: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month];
};

export const getDayName = (day: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[day];
};

export const getShortDayName = (day: number): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day];
};

export const formatEventTime = (date: Date, timeZone?: string): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone
  });
};

export const formatEventDate = (date: Date, timeZone?: string): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone
  });
};

export const getEventTypeColor = (type: EventType): string => {
  switch (type) {
    case 'sale':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'installment':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'reminder':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'custom':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getEventStatusColor = (status: EventStatus): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};