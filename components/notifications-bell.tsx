'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Filter, CheckCheck, Archive, BellOff, Inbox, Check, Wand2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { loadPersisted, subscribeNotifications } from '@/notifications/renderer/controller';
import { notificationsAdapter } from '@/notifications/renderer/adapter';
import { useToast } from '@/hooks/use-toast';
import type { NotificationItem } from '@/notifications/types'

export function NotificationsBell() {
  const router = useRouter();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [archived, setArchived] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);




  const [open, setOpen] = useState(false);
  const scrollRef = useRef<any>(null);
  const [visibleTypes, setVisibleTypes] = useState<{ alert: boolean; attention: boolean; info: boolean }>({ alert: true, attention: true, info: true });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [renderCount, setRenderCount] = useState(30);


  const pendingChangesRef = useRef<Map<number, { read: boolean; ts: number }>>(new Map());


  const [nowTick, setNowTick] = useState<number>(() => Date.now());



  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('notifications:visibleTypes');
      if (raw) {
        const parsed = JSON.parse(raw);
        setVisibleTypes({
          alert: !!parsed.alert,
          attention: !!parsed.attention,
          info: !!parsed.info,
        });
      }
    } catch {}
  }, []);



  useEffect(() => {
    const id = setInterval(() => {
      setNowTick(Date.now());
    }, 60_000); // cada 60s
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('notifications:visibleTypes', JSON.stringify(visibleTypes));
    } catch {}
  }, [visibleTypes]);
  
  
  function formatTitle(message: string, meta?: NotificationItem['meta']) {
      const key = meta?.message_key ?? '';
      if (key.startsWith('overdue|')) return 'Cuota vencida';
    if (key.startsWith('upcoming|')) return 'Cuota próxima a vencer';
    if (meta?.category === 'stock') {
      if (meta?.productName) return `Producto ${meta.productName}`;


      const firstPart = message?.split(' — ')[0] ?? '';
      const name = firstPart.replace(/^Stock bajo:\s*/i, '').trim();
      return name ? `Producto ${name}` : 'Stock';
    }
    if (meta?.category === 'system') return 'Sistema';


    const simplified = message?.split(' — ')[0] ?? message;
    return simplified || message;
  }



  useEffect(() => {
    const root = scrollRef.current as HTMLElement | null;
    const viewport = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const el = viewport ?? root;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const ratio = (scrollTop + clientHeight) / scrollHeight;
      if (ratio > 0.8) {
        const sourceLength = activeTab === 'archived' ? archived.length : notifications.length;
        setRenderCount((rc) => Math.min(rc + 20, sourceLength));
      }
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [notifications.length, archived.length, activeTab]);

  useEffect(() => {
    const sourceLength = activeTab === 'archived' ? archived.length : notifications.length;
    setRenderCount(Math.min(30, sourceLength));
  }, [notifications.length, archived.length, activeTab, visibleTypes]);

  const scrollToBottom = useCallback(() => {
    const root = scrollRef.current as HTMLElement | null;
    if (!root) return;
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const el = viewport ?? root;
    el.scrollTop = el.scrollHeight;
  }, []);



  const suppressedTodayRef = useRef<Set<string>>(new Set());
  const suppressedKeysRef = useRef<Set<string>>(new Set());
  const loadedOnOpenRef = useRef<boolean>(false);
  const filterSuppressed = useCallback((list: NotificationItem[]) => {
    const today = new Date().toDateString();
    const supMsgs = suppressedTodayRef.current;
    const supKeys = suppressedKeysRef.current;
    return list.filter(n => {
      const sameDay = new Date(n.created_at).toDateString() === today;
      const key = n.meta?.message_key;
      if (key && supKeys.has(key)) return false;
      return !(sameDay && !!n.message && supMsgs.has(n.message));
    });
  }, []);



  const reconcileWithLocal = useCallback((prev: NotificationItem[], next: NotificationItem[]) => {
    const now = Date.now();

    const merged = next.map((n) => {
      const p = prev.find(x => x.id === n.id);
      let read_at = n.read_at ?? null;



      if (p && p.read_at) {
        read_at = p.read_at;
      }



      if (typeof n.id === 'number') {
        const lock = pendingChangesRef.current.get(n.id);
        if (lock) {
          const expired = now - lock.ts > 60000; // 60s de protección
          if (!expired) {
            read_at = lock.read ? (read_at || new Date().toISOString()) : null;
          } else {
            const backendIsRead = !!n.read_at;
            if (backendIsRead === !!lock.read) {
              pendingChangesRef.current.delete(n.id);
            }
          }
        }
      }

      return { ...n, read_at } as NotificationItem;
    });

    return merged;
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(scrollToBottom, 0);
    return () => clearTimeout(id);
  }, [open, activeTab, notifications.length, archived.length, scrollToBottom]);


  const DEFAULT_CVU = '747382997471';



  const buildWhatsAppMessage = (m: NotificationItem['meta'] = {}): string => {
    const amountStr = typeof m.amount === 'number' ? formatAmountDesign(m.amount) : '';
    const interest = (m as any)?.interest;
    const interestStr = typeof interest === 'number' ? formatAmountDesign(interest) : '';
    const totalStr = typeof interest === 'number' && typeof m.amount === 'number'
      ? formatAmountDesign(m.amount + interest)
      : '';

    const hasDue = !!m.due_at;
    let dueLine = '';
    if (hasDue) {
      const dueMs = new Date(m.due_at!).getTime();
      const nowMs = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const days = Math.max(0, Math.floor(Math.abs(dueMs - nowMs) / dayMs));
      const dueDateStr = new Date(m.due_at!).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      dueLine = (dueMs < nowMs)
        ? `La cuota venció el ${dueDateStr} (hace ${days} días).`
        : `La cuota vence el ${dueDateStr} (en ${days} días).`;
    }

    const greeting = m.customerName ? `Hola ${m.customerName}, que tal?` : 'Hola, que tal?';
    const lines = [
      `${greeting}`,
      'Te escribo para informarte sobre tu cuota.',
      hasDue ? dueLine : undefined,
      'Detalle:',
      `• Importe de la cuota: ${amountStr || 'consultar'}`,
      typeof interest === 'number' ? `• Interés aplicado: ${interestStr}` : '• Interés: según condiciones del acuerdo',
      typeof interest === 'number' ? `• Total a pagar: ${totalStr}` : undefined,
      `CVU para depósito: ${DEFAULT_CVU}`,
      'Por favor, enviá el comprobante por este chat para acreditar el pago.',
      'Gracias.',
    ].filter(Boolean).join('\n');
    return lines;
  };

  const openWhatsAppForCustomer = useCallback(async (m: NotificationItem['meta']) => {
    if (!m) return;
    const normalize = (s: string) => String(s || '').replace(/\D/g, '');
    let digits = normalize(String(m.customerPhone ?? ''));
    if (!digits && m.customerName) {
      try {
        const customers = await (window.electronAPI?.database?.customers?.getAll?.() ?? []);
        const found = Array.isArray(customers)
          ? customers.find((c: any) => String(c?.name || '').trim().toLowerCase() === String(m.customerName).trim().toLowerCase())
          : null;
        digits = found?.phone ? normalize(String(found.phone)) : '';
      } catch { }
    }
    if (!digits) {
      console.warn('No se encontró teléfono para el cliente');
      return;
    }
    const body = buildWhatsAppMessage(m);
    const text = encodeURIComponent(body);
    const nativeUrl = `whatsapp://send?phone=+54${digits}&text=${text}`;
    const webUrl = `https://wa.me/+54${digits}?text=${text}`;
    // Intentamos abrir la app nativa; si no está disponible, abrimos la versión web
    try {
      const okNative = await (window as any)?.electronAPI?.openExternal?.(nativeUrl);
      if (okNative === false) throw new Error('openExternal whatsapp:// returned false');
    } catch {
      try {
        const okWeb = await (window as any)?.electronAPI?.openExternal?.(webUrl);
        if (okWeb === false) throw new Error('openExternal wa.me returned false');
      } catch {
        const a = document.createElement('a');
        a.href = webUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    }
  }, []);

  

  const renderActions = (n: NotificationItem, m: NotificationItem['meta'] = {}, isRead: boolean) => {


    const baseActions = (
      <>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95", isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold")}
          title={isRead ? "Marcar no leída" : "Marcar leído"}
          onClick={(e) => { e.preventDefault(); toggleNotificationRead(n.id, isRead); }}
        >
          {isRead ? <CheckCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95", isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold")}
          title="Archivar"
          onClick={(e) => { e.preventDefault(); archiveNotification(n.id); }}
        >
          <Archive className="h-4 w-4 mr-1" /> 
        </Button>
      </>
    );



    if (m?.category === 'stock') {
      const pid = m?.productId;
      return (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95", isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold")}
            onClick={(e) => { e.preventDefault(); router.push(pid ? `/products?highlight=${pid}` : '/products'); }}
            title="Revisar producto"
          >
            Revisar
          </Button>
          {baseActions}
        </>
      );
    }



    if (n.type === 'alert') {
      return (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95", isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold")}
            onClick={(e) => { e.preventDefault(); router.push('/sales?tab=installments'); }}
          >
            Revisar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95", isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold")}
            onClick={(e) => { e.preventDefault(); openWhatsAppForCustomer(m); }}
          >
            Notificar cliente
          </Button>
          {baseActions}
        </>
      );
    }



    if (n.type === 'attention' && m?.category === 'client') {
      return (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95", isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold")}
            onClick={(e) => { e.preventDefault(); router.push(m?.route || '/sales?tab=installments'); }}
            title={m?.actionLabel || 'Revisar'}
          >
            {m?.actionLabel || 'Revisar'}
          </Button>
          {baseActions}
        </>
      );
    }



    if (m?.category === 'system') {
      const onOpenDownloads = async () => {
        try {
          const downloads = await (window as any)?.electronAPI?.getDownloadsPath?.();
          if (downloads) {
            await (window as any)?.electronAPI?.openPath?.(downloads);
          }
        } catch {}
      };
      return (
        <>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95", isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold")}
            onClick={(e) => { e.preventDefault(); onOpenDownloads(); }}
            title={m?.actionLabel || 'Mostrar en carpeta'}
          >
            {m?.actionLabel || 'Mostrar en carpeta'}
          </Button>
          {baseActions}
        </>
      );
    }
    return baseActions;
  };

  const formatExpirationLine = (m: NotificationItem['meta'] = {}) => {

    if (m.category === 'system' && typeof m.duration_ms === 'number') {
      const ms = m.duration_ms;
      const pretty = ms < 1 ? `${(ms * 1000).toFixed(1)}µs` : ms < 1000 ? `${ms.toFixed(1)}ms` : `${(ms / 1000).toFixed(2)}s`;
      return `tiempo: ${pretty}`;
    }

    if (m.due_at) {
      const now = Date.now();
      const due = new Date(m.due_at).getTime();
      const diff = due - now;
      const dayMs = 24 * 60 * 60 * 1000;
      const absDays = Math.max(0, Math.floor(Math.abs(diff) / dayMs));
      if (Math.abs(diff) < dayMs && diff < 0) return 'Venció hoy';
      if (Math.abs(diff) < dayMs && diff >= 0) return 'Vence hoy';
      if (diff >= 0) return `Vencimiento en ${absDays} días`;
      return `Venció hace ${absDays} días`;
    }
    return undefined;
  };

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('notifications:snoozeUntil');
      if (stored) {
        const ts = Number(stored);
        if (!Number.isNaN(ts)) setSnoozeUntil(ts);
      }
    } catch { }
  }, []);


  const unreadCount = useMemo(() => notifications.filter(n => !n.read_at).length, [notifications]);

  useEffect(() => {
    (async () => {


      const initial = await loadPersisted(50);
      setNotifications(filterSuppressed(initial));

      try {
        const unsub = subscribeNotifications(() => notifications, (next) => {
          if (typeof next === 'function') {
            setNotifications(prev => next(prev));
          } else {
            setNotifications(next);
          }
          if (open) {
            setTimeout(scrollToBottom, 0);
          }
        });
        (window as any).__notificationsUnsub = unsub;
        const __loadPersisted = async () => {
          const refreshed = await loadPersisted(50);
          setNotifications(prev => filterSuppressed(reconcileWithLocal(prev, refreshed)));
        };
        (window as any).__loadPersisted = __loadPersisted;


        if (open && !loadedOnOpenRef.current) {
          __loadPersisted();
          loadedOnOpenRef.current = true;
        }

      } catch {}
    })();

    return () => {
      try {
        const unsub = (window as any).__notificationsUnsub;
        if (typeof unsub === 'function') unsub();
      } catch {}
    };


  }, [snoozeUntil, open]);



  useEffect(() => {
    const loadArchived = async () => {
      try {
        console.log('Loading archived notifications...');
        const rows = await notificationsAdapter.listArchived(50);
        console.log('Archived notifications loaded:', rows);
        setArchived(rows || []);
      } catch (e) {
        console.error('Error loading archived notifications:', e);
      }
    };
    if (activeTab === 'archived') {
      loadArchived();
    }
  }, [activeTab]);

  const toggleNotificationRead = useCallback(async (id?: number, isRead?: boolean) => {
    if (!id) return;
    const nextRead = !isRead; // estado al que queremos ir


    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read_at: nextRead ? new Date().toISOString() : null } : n)));
    pendingChangesRef.current.set(id, { read: nextRead, ts: Date.now() });
    try {
      if (isRead) {
        await notificationsAdapter.markUnread(id);
      } else {
        await notificationsAdapter.markRead(id);
      }
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado de lectura' });
    }
  }, [toast]);

  const markAllRead = useCallback(async () => {
    const ids = notifications.filter(n => !n.read_at && n.id).map(n => n.id!);
    try {
      for (const id of ids) {
        await notificationsAdapter.markRead(id);
      }
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudieron marcar todas como leídas' });
    }
    setNotifications(prev => prev.map(n => (!n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
  }, [notifications, toast]);

  const openRelated = useCallback((n: NotificationItem) => {


    router.push('/sales');
  }, [router]);

  const snooze = useCallback((hours: number = 1) => {
    const until = Date.now() + hours * 60 * 60 * 1000;
    setSnoozeUntil(until);
    try { window.localStorage.setItem('notifications:snoozeUntil', String(until)); } catch { }
  }, []);

  const clearSnooze = useCallback(() => {
    setSnoozeUntil(null);
    try { window.localStorage.removeItem('notifications:snoozeUntil'); } catch { }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {


      const snapshot = [...notifications];



      for (const n of snapshot) {
        const key = n.meta?.message_key;
        if (key) {
          suppressedKeysRef.current.add(key);
          await notificationsAdapter.deleteByKeyToday(key);
        } else if (n.message) {
          suppressedTodayRef.current.add(n.message);
          await notificationsAdapter.deleteByMessageToday(n.message);
        }
      }



      await notificationsAdapter.clearAll();
      


      setNotifications([]);
      
      toast({ title: 'Listo', description: 'Todas las notificaciones han sido eliminadas permanentemente' });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast({ 
        title: 'Error', 
        description: 'No se pudieron eliminar las notificaciones. Intenta de nuevo.' 
      });
    }
  }, [notifications, toast]);


  const emitStockTest = useCallback(async () => {
    const payload = {
      message: 'Stock bajo: Producto de prueba — quedó en 0 unidades — $10000 — Demostración',
      type: 'attention',
    } as const;
    const ok = await notificationsAdapter.emitTestEvent(payload);
    if (!ok) {
      setNotifications(prev => [
        ...prev,
        { message: payload.message, type: payload.type, created_at: new Date().toISOString() } as any,
      ]);
    }
  }, []);

  const archiveNotification = useCallback(async (id?: number) => {
    if (!id) return;
    
    console.log('Archiving notification with id:', id);
    


    setNotifications(prev => prev.filter(n => n.id !== id));
    
    try {


      await notificationsAdapter.delete(id);
      console.log('Notification archived successfully:', id);



      try {
        const rows = await notificationsAdapter.listArchived(50);
        console.log('Refreshed archived list after archiving:', rows);
        setArchived(rows || []);
      } catch (e) {
        console.error('Error loading archived notifications:', e);
      }
    } catch (e) {
      console.error('Error archiving notification:', e);


      try {
        const normalized = await loadPersisted(50);
        setNotifications(normalized);
      } catch {}
    }
  }, []);



  const typeMeta = (t: NotificationItem['type']) => {
    if (t === 'alert') return { label: 'Crítica', dot: 'bg-red-500', badge: 'text-red-500 border-red-500' };
    if (t === 'attention') return { label: 'Atención', dot: 'bg-amber-500', badge: 'text-orange-500 border-orange-500' };
    return { label: 'Sistema', dot: 'bg-blue-500', badge: 'text-blue-500 border-blue-500' };
  };
  const formatAmountDesign = (a?: number) => {
    if (typeof a !== 'number') return '';
    const base = Intl.NumberFormat('es-ES', { useGrouping: true, maximumFractionDigits: 0 }).format(a).replace(/,/g, '.');
    return `$${base}0`;
  };
  const formatRelative = (iso: string) => {


    const normalizeTs = (s: string): number => {
      try {
        if (s && s.includes(' ') && !s.includes('T')) {
          const candidate = s.replace(' ', 'T') + 'Z';
          const t = new Date(candidate).getTime();
          if (!Number.isNaN(t)) return t;
        }
        const t2 = new Date(s).getTime();
        return Number.isNaN(t2) ? Date.now() : t2;
      } catch {
        return Date.now();
      }
    };
    const d = normalizeTs(iso);
    const diff = Math.max(0, Date.now() - d);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'hace unos segundos';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const days = Math.floor(h / 24);
    return `hace ${days} d`;
  };

  const filtered = useMemo(() => {
    const source = activeTab === 'archived' ? archived : notifications;
    console.log(`Filtering for tab "${activeTab}":`, { source, archived, notifications });
    const base = activeTab === 'unread'
      ? source.filter(n => !n.read_at)
      : activeTab === 'read'
        ? source.filter(n => !!n.read_at)
        : source;
    const byType = base.filter(n => visibleTypes[n.type]);
    const result = [...byType].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    console.log(`Filtered result for tab "${activeTab}":`, result);
    return result;
  }, [notifications, archived, activeTab, visibleTypes]);

  const snoozeActive = snoozeUntil && Date.now() < snoozeUntil;
  const snoozeLabel = snoozeActive ? `Silenciado hasta ${new Date(snoozeUntil!).toLocaleTimeString('es-ES')}` : undefined;



  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40 pointer-events-none animate-in fade-in-0 duration-200" />}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 rounded-2xl">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="group relative h-10 w-10 rounded-md shadow-md transition-transform active:scale-95">
              <Inbox className={cn("h-5 w-5 origin-top transition-transform", !open && unreadCount > 0 && "animate-ring")} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-sm px-1 min-w-[18px] text-center shadow-sm animate-badge-pop transition-transform group-hover:scale-110">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" side="bottom" className="w-[42rem] p-0 rounded-3xl overflow-hidden flex flex-col max-h-[80vh] animate-pop" onInteractOutside={(e) => { if (filtersOpen) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (filtersOpen) e.preventDefault(); }}>
            <div className="px-4 py-3 flex items-center justify-between gap-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="rounded-3xl border border-[#3C3C3C] bg-[#202020]">
                  <TabsTrigger className="rounded-3xl w-[100px]" value="all">Todas</TabsTrigger>
                  <TabsTrigger className="rounded-3xl w-[100px]" value="unread">Nuevas</TabsTrigger>
                  <TabsTrigger className="rounded-3xl w-[100px]" value="read">Leídas</TabsTrigger>
                  <TabsTrigger className="rounded-3xl w-[120px]" value="archived">Archivadas</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <DropdownMenu onOpenChange={setFiltersOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" title="Filtrar">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44" data-dropdown-content>
                    <DropdownMenuCheckboxItem checked={visibleTypes.alert} onCheckedChange={(v) => setVisibleTypes(s => ({ ...s, alert: !!v }))}>
                      Críticas
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleTypes.attention} onCheckedChange={(v) => setVisibleTypes(s => ({ ...s, attention: !!v }))}>
                      Atención
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={visibleTypes.info} onCheckedChange={(v) => setVisibleTypes(s => ({ ...s, info: !!v }))}>
                      Sistema
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" title="Marcar todas como leídas" onClick={markAllRead}>
                  <CheckCheck className="h-4 w-4" />
                </Button>
                {!snoozeActive ? (
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" title="Silenciar 1h" onClick={() => snooze(1)}>
                    <BellOff className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" title="Reactivar" onClick={clearSnooze}>
                    <Bell className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <Separator />
            <ScrollArea className="h-[60vh]" ref={scrollRef}>
              <div className="w-full h-44 absolute z-10 bg-gradient-to-b from-[#151515] to-transparent pointer-events-none"></div>
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-sm text-muted-foreground">Sin notificaciones</div>
              ) : (
                <ul className="p-4 space-y-3 flex flex-col justify-end min-h-[60vh]">
                  {filtered.slice(Math.max(0, filtered.length - renderCount), filtered.length).map((n) => {
                    const meta = typeMeta(n.type);
                    const m = n.meta ?? {};
                    const isRead = !!n.read_at;
                    const secondaryLine = m.category === 'client'
                      ? (() => {
                          const names = Array.isArray(m.customerNames) ? m.customerNames : (m.customerName ? [m.customerName] : []);
                          const shown = names.slice(0, 2); // mostrar hasta 2 nombres
                          const count = typeof m.customerCount === 'number' ? m.customerCount : Math.max(names.length, shown.length);
                          const extras = Math.max(0, count - shown.length);
                          const multi = extras > 0 || shown.length > 1;
                          const label = multi ? 'Clientes' : 'Cliente';
                          const namesStr = shown.length > 0 ? shown.join(', ') : (m.customerName ?? 'Cliente');


                          return `${label}: ${namesStr}${extras > 0 ? `... +${extras}` : ''}`;
                        })()
                      : m.category === 'system'
                        ? (() => {
                            const parts: string[] = [];
                            if (m.systemStatus) parts.push(String(m.systemStatus));
                            const filename = (m as any)?.downloadFilename || (String(n.message || '').match(/Descarga completada:\s([^—]+)/i)?.[1]?.trim() || '');
                            if (filename) parts.push(`${filename}`);
                            const line = parts.join(' • ');
                            return `Sistema: ${line || n.message}`;
                          })()
                        : m.category === 'stock'
                          ? (() => {
                              const parts = [];
                              if (m.stockStatus) parts.push(`Stock: ${m.stockStatus}`);
                              if (m.productPrice) parts.push(`$${m.productPrice}`);
                              if (m.productCategory) parts.push(m.productCategory);
                              return parts.length > 0 ? parts.join(' • ') : 'Stock';
                            })()
                          : undefined;
                    const uniqueKey = n.id ?? `${n.created_at}-${n.type}-${n.message}`;
                    return (
                      <li key={uniqueKey} className={cn("rounded-3xl border animate-in fade-in-0 slide-in-from-bottom-1 transition-transform duration-200", isRead ? "bg-[#151515] border-[#2b2b2b] hover:bg-[#1a1a1a]" : "bg-[#202020] border-[#3C3C3C] hover:bg-[#262626]")}> 
                        <div className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={cn(`mt-1 w-2.5 h-2.5 rounded-full ${meta.dot}`, isRead && "opacity-50")} />
                              <div className="space-y-1 min-w-0">
                                <div className={cn("text-sm", isRead ? "text-muted-foreground opacity-70 font-medium" : "font-semibold")}>
                                    {formatTitle(n.message, m)}
                                </div>
                                {secondaryLine && (
                                  <div className="text-xs text-muted-foreground font-bold">{secondaryLine}</div>
                                )}
                                {(() => {
                                  const line = formatExpirationLine(m);
                                  return line ? (
                                    <div className="text-xs text-muted-foreground">{line}</div>
                                  ) : null;
                                })()}
                                {typeof m.amount === 'number' && (
                                  <div className={cn("text-lg mt-2", isRead ? "text-muted-foreground font-medium" : "font-semibold")}>{formatAmountDesign(m.amount)}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn(isRead ? "text-muted-foreground border-[#3C3C3C]" : meta.badge)}>{meta.label}</Badge>
                            </div>
                          </div>
                        </div>
                        <Separator className={cn("w-[calc(100%-30px)] mx-auto", isRead ? "bg-[#2b2b2b]" : "bg-[#3C3C3C] ")} />
                        <div className="px-4 py-2 flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground" title={new Date(n.created_at).toLocaleString('es-ES')}>
                            {formatRelative(n.created_at)}
                          </span>
                          <div className="flex items-center gap-2">
                            {renderActions(n, m, isRead)}
                          </div>
                            </div>
                        </li>
                      );
                  })}
                </ul>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}


