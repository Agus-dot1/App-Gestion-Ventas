'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Command } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchTriggerProps {
  onOpenSearch: () => void;
  collapsed?: boolean;
}

export function SearchTrigger({ onOpenSearch, collapsed }: SearchTriggerProps) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const shortcutKey = isMac ? '⌘' : 'Ctrl';

  return (
    <Button
      variant="outline"
      className={cn(
        'w-full justify-start gap-3 h-10 transition-colors text-muted-foreground hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
      onClick={onOpenSearch}
    >
      <Search className="h-4 w-4 flex-shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">Search everything...</span>
          <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
            {isMac ? <Command className="w-3 h-3" /> : <span>{shortcutKey}</span>}
            <span>K</span>
          </div>
        </>
      )}
    </Button>
  );
}