


'use client';

import { useEffect } from 'react';

interface UseSearchShortcutProps {
  onOpenSearch: () => void;
  onToggleSearch?: () => void;
}

export function useSearchShortcut({ onOpenSearch, onToggleSearch }: UseSearchShortcutProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        if (onToggleSearch) {
          onToggleSearch();
        } else {
          onOpenSearch();
        }
      }
      
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        onOpenSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch, onToggleSearch]);
}