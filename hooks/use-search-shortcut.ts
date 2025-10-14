'use client';

import { useEffect } from 'react';

interface UseSearchShortcutProps {
  onOpenSearch: () => void;
}

export function useSearchShortcut({ onOpenSearch }: UseSearchShortcutProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'g') {
        event.preventDefault();
        onOpenSearch();
      }
      
      // Also handle Cmd+/ or Ctrl+/ as alternative
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        onOpenSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);
}