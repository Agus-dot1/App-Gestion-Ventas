'use client';

import { ReactNode, useEffect, useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Initialize with false to match server-side rendering
  const [reduceAnimations, setReduceAnimations] = useState<boolean>(false)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Set hydrated flag and read from localStorage after hydration
    setIsHydrated(true)
    const storedValue = localStorage.getItem('reduceAnimations') === 'true'
    setReduceAnimations(storedValue)
  }, [])

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
    <div className={isHydrated && reduceAnimations ? '' : 'animate-in fade-in duration-700'}>
      {children}
    </div>
  );
}