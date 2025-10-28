'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { SearchDialog } from '@/components/search/search-dialog';
import { SearchTrigger } from '@/components/search/search-trigger';
import { useSearchShortcut } from '@/hooks/use-search-shortcut';
import { useRoutePrefetch } from '@/hooks/use-route-prefetch';
import { notificationsAdapter } from '@/notifications/renderer/adapter';
import type { NotificationItem } from '@/notifications/types';

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
  LayoutDashboard,
  Bell,
  ChevronDown,
  ChevronUp
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



  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    try {
      notificationsAdapter.list(25).then((list) => setNotifications(list ?? []));
      const unsub = notificationsAdapter.subscribe((item) => {
        setNotifications(prev => [item, ...prev]);
      });
      (window as any).__sidebarNotificationsUnsub = unsub;
    } catch {}
    return () => {
      try {
        const unsub = (window as any).__sidebarNotificationsUnsub;
        if (typeof unsub === 'function') unsub();
      } catch {}
    }
  }, []);


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

  // NEW: partners for expandable sales submenu
  const [partners, setPartners] = useState<any[]>([]);
  const [salesExpanded, setSalesExpanded] = useState(false);
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!(window as any).electronAPI);

  useEffect(() => {
    const loadPartners = async () => {
      try {
        const api = (window as any).electronAPI;
        if (!api?.database?.partners?.getAll) return;
        const list = await api.database.partners.getAll();
        setPartners(list || []);
      } catch {}
    };
    if (isElectron) {
      loadPartners();
      // Listen for global partner changes to refresh sidebar submenu
      const handler = () => {
        loadPartners();
      };
      try {
        window.addEventListener('partners:changed', handler);
      } catch {}
      return () => {
        try {
          window.removeEventListener('partners:changed', handler);
        } catch {}
      };
    }
  }, [isElectron]);

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

              if (item.title === 'Ventas') {
                return (
                  <div key={item.href} className="relative">
                    <Link
                      href={item.href}
                      className="block"
                      onMouseEnter={() => {
                        if (item.prefetch) item.prefetch();
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
                        {!collapsed && <span className="truncate">{item.title}</span>}
                        {!collapsed && (
                          <span className="ml-auto inline-flex items-center">
                            <span
                              role="button"
                              tabIndex={0}
                              className="p-1 rounded hover:bg-muted"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSalesExpanded(prev => !prev);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSalesExpanded(prev => !prev);
                                }
                              }}
                              aria-label={salesExpanded ? 'Contraer Ventas' : 'Expandir Ventas'}
                            >
                              {salesExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </span>
                          </span>
                        )}
                      </Button>
                    </Link>

                    {partners.length > 0 && (
                      <Collapsible open={!collapsed && salesExpanded}>
                        <CollapsibleContent className="mt-1 ml-5 pl-5 space-y-1 border-l">
                          {partners.map((p: any) => (
                            <Link key={p.id} href={`/sales?partner=${p.id}`} className="block">
                              <Button
                                variant={'ghost'}
                                className={cn('w-full justify-start h-7 text-sm', 'gap-2')}
                              >
                                <span className="truncate">{p.name}</span>
                              </Button>
                            </Link>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block"
                  onMouseEnter={() => {
                    if (item.prefetch) item.prefetch();
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
                    {!collapsed && <span className="truncate">{item.title}</span>}
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