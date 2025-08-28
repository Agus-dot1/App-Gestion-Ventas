'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent, CalendarDay, CalendarWeek } from '@/lib/calendar-types';
import { isSameDay, isSameMonth, isToday, getMonthName, getShortDayName, getEventTypeColor, getEventStatusColor } from '@/lib/calendar-types';

interface CalendarComponentProps {
  events: CalendarEvent[];
  selectedDate: Date;
  currentMonth: Date;
  timeZone?: string;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarComponent({
  events,
  selectedDate,
  currentMonth,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  onDateSelect,
  onMonthChange,
  onEventClick
}: CalendarComponentProps) {
  const [calendarDays, setCalendarDays] = useState<CalendarWeek[]>([]);

  // Generate calendar days for the current month
  const generateCalendarDays = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Sunday of the calendar view
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // End at the last Saturday of the calendar view
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const weeks: CalendarWeek[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const week: CalendarDay[] = [];
      
      for (let i = 0; i < 7; i++) {
        const dayEvents = events.filter(event => isSameDay(event.date, currentDate, timeZone));
        
        week.push({
          date: new Date(currentDate),
          isCurrentMonth: isSameMonth(currentDate, currentMonth, timeZone),
          isToday: isToday(currentDate, timeZone),
          isSelected: isSameDay(currentDate, selectedDate, timeZone),
          events: dayEvents
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      weeks.push({ days: week });
    }
    
    setCalendarDays(weeks);
  }, [currentMonth, events, selectedDate]);

  useEffect(() => {
    generateCalendarDays();
  }, [generateCalendarDays]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    onMonthChange(newMonth);
  };

  const goToToday = () => {
    const today = new Date();
    onMonthChange(today);
    onDateSelect(today);
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventClick(event);
  };

  // Ref for the calendar grid
  const gridRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, date: Date, weekIndex: number, dayIndex: number) => {
    // Prevent default behavior for handled keys
    if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
    }

    // Handle selection keys
    if (e.key === 'Enter' || e.key === ' ') {
      handleDateClick(date);
      return;
    }

    // Handle navigation keys only if we have the grid ref
    if (!gridRef.current) return;

    const totalWeeks = calendarDays.length;
    const totalDays = 7;

    let newWeekIndex = weekIndex;
    let newDayIndex = dayIndex;

    switch (e.key) {
      case 'ArrowUp':
        // Move to the same day in the previous week
        newWeekIndex = Math.max(0, weekIndex - 1);
        break;
      case 'ArrowDown':
        // Move to the same day in the next week
        newWeekIndex = Math.min(totalWeeks - 1, weekIndex + 1);
        break;
      case 'ArrowLeft':
        // Move to the previous day
        if (dayIndex > 0) {
          newDayIndex = dayIndex - 1;
        } else if (weekIndex > 0) {
          // Move to the last day of the previous week
          newWeekIndex = weekIndex - 1;
          newDayIndex = totalDays - 1;
        }
        break;
      case 'ArrowRight':
        // Move to the next day
        if (dayIndex < totalDays - 1) {
          newDayIndex = dayIndex + 1;
        } else if (weekIndex < totalWeeks - 1) {
          // Move to the first day of the next week
          newWeekIndex = weekIndex + 1;
          newDayIndex = 0;
        }
        break;
      case 'Home':
        // Move to the first day of the current week
        newDayIndex = 0;
        break;
      case 'End':
        // Move to the last day of the current week
        newDayIndex = totalDays - 1;
        break;
      default:
        return; // Do nothing for other keys
    }

    // Find the new date cell and focus it
    const newDateCell = gridRef.current.querySelector(`[data-week="${newWeekIndex}"][data-day="${newDayIndex}"]`) as HTMLElement | null;
    if (newDateCell) {
      newDateCell.focus();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {getMonthName(currentMonth.getMonth())} {currentMonth.getFullYear()}
            <span className="text-sm font-normal text-muted-foreground">({timeZone})</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {/* Day headers */}
          {[0, 1, 2, 3, 4, 5, 6].map(day => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {getShortDayName(day)}
            </div>
          ))}
        </div>

        <div ref={gridRef} className="grid grid-cols-7 gap-1">
          {calendarDays.map((week, weekIndex) =>
            week.days.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                data-week={weekIndex}
                data-day={dayIndex}
                className={cn(
                  'min-h-[80px] sm:min-h-[100px] p-1 border rounded-lg cursor-pointer transition-colors',
                  'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary',
                  {
                    'bg-primary text-primary-foreground': day.isSelected,
                    'bg-muted/30': !day.isCurrentMonth,
                    'ring-2 ring-blue-500': day.isToday && !day.isSelected,
                  }
                )}
                onClick={() => handleDateClick(day.date)}
                onKeyDown={(e) => handleKeyDown(e, day.date, weekIndex, dayIndex)}
                tabIndex={0}
                role="button"
                aria-label={`${day.date.toLocaleDateString()}, ${day.events.length} eventos`}
              >
                <div className="flex flex-col h-full">
                  {/* Date number */}
                  <div className={cn(
                    'text-sm font-medium mb-1',
                    {
                      'text-muted-foreground': !day.isCurrentMonth,
                      'text-primary-foreground': day.isSelected,
                    }
                  )}>
                    {day.date.getDate()}
                  </div>

                  {/* Events */}
                  <div className="flex-1 space-y-1">
                    {day.events.slice(0, 2).map((event, eventIndex) => (
                      <div
                        key={event.id}
                        className={cn(
                          'text-xs p-1 rounded border cursor-pointer transition-colors',
                          'hover:shadow-sm',
                          getEventTypeColor(event.type)
                        )}
                        onClick={(e) => handleEventClick(event, e)}
                        title={`${event.title} - ${event.description}`}
                      >
                        <div className="flex items-center gap-1">
                          <div className={cn(
                            'w-2 h-2 rounded-full flex-shrink-0',
                            getEventStatusColor(event.status).replace('bg-', 'bg-').replace('text-', 'bg-')
                          )} />
                          <span className="truncate font-medium">
                            {event.title}
                          </span>
                        </div>
                        {event.amount && (
                          <div className="text-xs opacity-75 mt-0.5 hidden sm:block">
                            ${event.amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {/* Show more indicator with popover */}
                    {day.events.length > 2 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="text-xs text-muted-foreground text-center py-1 cursor-pointer hover:underline flex items-center justify-center gap-1">
                            <MoreHorizontal className="w-3 h-3" />
                            +{day.events.length - 2} más
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" align="center">
                          <div className="max-h-60 overflow-y-auto p-2">
                            <h4 className="font-medium text-sm p-2 border-b">Más Eventos ({day.events.length})</h4>
                            <div className="space-y-2 p-2">
                              {day.events.slice(2).map((event) => (
                                <div
                                  key={event.id}
                                  className={cn(
                                    'text-xs p-2 rounded border cursor-pointer transition-colors',
                                    'hover:shadow-sm',
                                    getEventTypeColor(event.type)
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event, e);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        'w-2 h-2 rounded-full flex-shrink-0',
                                        getEventStatusColor(event.status).replace('bg-', 'bg-').replace('text-', 'bg-')
                                      )} />
                                      <span className="font-medium truncate">
                                        {event.title}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className={cn('text-xs', getEventStatusColor(event.status))}>
                                      {event.status}
                                    </Badge>
                                  </div>
                                  {event.description && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                      {event.description}
                                    </p>
                                  )}
                                  {event.amount && (
                                    <div className="text-xs mt-1">
                                      Monto: <span className="font-medium">${event.amount.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Ventas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Cuotas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span>Recordatorios</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Vencido</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}