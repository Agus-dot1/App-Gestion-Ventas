'use client';

import { ReactNode, Suspense, useEffect, useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [reduceAnimations, setReduceAnimations] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reduceAnimations') === 'true'
    }
    return false
  })

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && typeof detail.reduceAnimations === 'boolean') {
        setReduceAnimations(detail.reduceAnimations)
      }
    }
    window.addEventListener('app:settings-changed', handler as EventListener)
    return () => window.removeEventListener('app:settings-changed', handler as EventListener)
  }, [])

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <div className={reduceAnimations ? '' : 'animate-in fade-in duration-700'}>
          {children}
      </div>
    </Suspense>
  );
}