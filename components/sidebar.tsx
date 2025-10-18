'use client';

import { useState, useCallback, useEffect } from 'react';
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
  CreditCard,
  LayoutDashboard
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  initialCollapsed?: boolean;
}


export function Sidebar({ className, initialCollapsed = false }: SidebarProps) {
  // Initialize from server-provided cookie to align SSR and client
  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState<string>('/');
  const { prefetchProducts, prefetchCustomers, prefetchSales, prefetchCalendar } = useRoutePrefetch();

  // After mount, restore collapsed state from localStorage (first load may briefly flicker)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('sidebar:collapsed');
      if (stored !== null) {
        setCollapsed(stored === 'true');
      }
    } catch {
      // ignore read errors
    }
  }, []);

  // Persist collapsed state so it survives route changes and reloads
  useEffect(() => {
    try {
      window.localStorage.setItem('sidebar:collapsed', String(collapsed));
      // Also persist to cookie so SSR matches on first load
      document.cookie = `sidebar-collapsed=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } catch {
      // ignore write errors (e.g., privacy mode)
    }
  }, [collapsed]);

  // Keep a stable, normalized current path to avoid transient '/' on first paint
  useEffect(() => {
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : (pathname || '/');
      setCurrentPath(path || '/');
    } catch {
      setCurrentPath(pathname || '/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pathname) {
      setCurrentPath(pathname);
    }
  }, [pathname]);

  const isRouteActive = useCallback((href: string) => {
    // Normalize paths (remove trailing slash except for root)
    const normalize = (p: string) => (p && p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p || '/');
    const current = normalize(currentPath || '/');
    const target = normalize(href);
    if (target === '/') return current === '/';
    return current === target || current.startsWith(`${target}/`);
  }, [currentPath]);

  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const handleToggleSearch = useCallback(() => {
    setSearchOpen(prev => !prev);
  }, []);

  // Set up global keyboard shortcut
  useSearchShortcut({ onOpenSearch: handleOpenSearch, onToggleSearch: handleToggleSearch });
  const navigationItems = [
    {
      title: 'Inicio',
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
    //{
    //  title: 'Calendario',
    //  icon: Calendar,
    //  href: '/calendar',
    //  prefetch: prefetchCalendar
    //},
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
                <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
              </div>
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
              const isActive = isRouteActive(item.href);
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
                    aria-current={isActive ? 'page' : undefined}
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
                variant={isRouteActive('/ajustes') ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-10 transition-colors',
                  collapsed && 'justify-center px-2',
                  isRouteActive('/ajustes') && 'bg-secondary text-secondary-foreground font-medium'
                )}
                aria-current={isRouteActive('/ajustes') ? 'page' : undefined}
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