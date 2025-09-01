'use client';

import { useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SearchDialog } from '@/components/search/search-dialog';
import { SearchTrigger } from '@/components/search/search-trigger';
import { useSearchShortcut } from '@/hooks/use-search-shortcut';
import { useRoutePrefetch } from '@/hooks/use-route-prefetch';
import {
  Home,
  BarChart3,
  Package,
  Users,
  Settings,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}


export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const { prefetchProducts, prefetchCustomers, prefetchSales, prefetchCalendar } = useRoutePrefetch();

  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  // Set up global keyboard shortcut
  useSearchShortcut({ onOpenSearch: handleOpenSearch });
  const navigationItems = [
    {
      title: 'Dashboard',
      icon: Home,
      href: '/',
      prefetch: null
    },
    {
      title: 'Productos',
      icon: Package,
      href: '/products',
      prefetch: prefetchProducts
    },
    {
      title: 'Clientes',
      icon: Users,
      href: '/customers',
      prefetch: prefetchCustomers
    },
    {
      title: 'Ventas',
      icon: CreditCard,
      href: '/sales',
      prefetch: prefetchSales
    },
    {
      title: 'Calendario',
      icon: Calendar,
      href: '/calendar',
      prefetch: prefetchCalendar
    },
    // {
    //   title: 'Analytics',
    //   icon: BarChart3,
    //   href: '/analytics'
    // },
    // {
    //   title: 'Reports',
    //   icon: FileText,
    //   href: '/reports'
    // },
    // {
    //   title: 'Notifications',
    //   icon: Bell,
    //   href: '/notifications'
    // }
  ];

  return (
    <>
      <div
        className={cn(
          'relative flex flex-col border-r bg-background transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Dashboard</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-3 py-4 border-b">
          <SearchTrigger onOpenSearch={handleOpenSearch} collapsed={collapsed} />
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block"
                  onMouseEnter={() => {
                    // Prefetch data on hover for instant navigation
                    if (item.prefetch) {
                      item.prefetch();
                    }
                  }}
                >
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3 h-10 transition-colors',
                      collapsed && 'justify-center px-2',
                      isActive && 'bg-secondary text-secondary-foreground font-medium'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.title}</span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>

          <Separator className="my-4" />

          {/* Settings */}
          <div className="space-y-2">
            <Link
              href="/ajustes"
              className="block"
            >
              <Button
                variant={pathname === '/ajustes' ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-10 transition-colors',
                  collapsed && 'justify-center px-2',
                  pathname === '/ajustes' && 'bg-secondary text-secondary-foreground font-medium'
                )}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span className="truncate">Ajustes</span>}
              </Button>
            </Link>
          </div>
        </ScrollArea>
      </div>

      {/* Search Dialog */}
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}