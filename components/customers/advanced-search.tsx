'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, X, User, Mail, Building, Phone, MapPin, CreditCard } from 'lucide-react';
import type { Customer } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

// Fuzzy matching utility
function fuzzyMatch(text: string, query: string): { score: number; matches: number[] } {
  if (!query) return { score: 0, matches: [] };
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match gets highest score
  if (textLower.includes(queryLower)) {
    const index = textLower.indexOf(queryLower);
    return {
      score: 100 - index, // Earlier matches score higher
      matches: Array.from({ length: query.length }, (_, i) => index + i)
    };
  }
  
  // Fuzzy matching
  let score = 0;
  let matches: number[] = [];
  let queryIndex = 0;
  
  for (let i = 0; i < text.length && queryIndex < query.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      matches.push(i);
      score += query.length - queryIndex; // Earlier characters in query score higher
      queryIndex++;
    }
  }
  
  // Bonus for consecutive matches
  let consecutiveBonus = 0;
  for (let i = 1; i < matches.length; i++) {
    if (matches[i] === matches[i - 1] + 1) {
      consecutiveBonus += 5;
    }
  }
  
  return {
    score: queryIndex === query.length ? score + consecutiveBonus : 0,
    matches
  };
}

interface SearchSuggestion {
  id: string;
  type: 'customer' | 'email' | 'phone' | 'dni';
  label: string;
  value: string;
  customer?: Customer;
  icon: React.ComponentType<{ className?: string }>;
  score: number;
  matches: number[];
}

interface AdvancedSearchProps {
  customers: Customer[];
  onSearchChange: (query: string) => void;
  onCustomerSelect?: (customer: Customer) => void;
  placeholder?: string;
  className?: string;
}

export function AdvancedSearch({
  customers,
  onSearchChange,
  onCustomerSelect,
  placeholder = "Buscar clientes...",
  className
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate suggestions based on query
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const newSuggestions: SearchSuggestion[] = [];
    const queryTrimmed = query.trim();

    customers.forEach(customer => {
      // DNI suggestions (highest priority for exact matches)
      if (customer.dni) {
        const dniMatch = fuzzyMatch(customer.dni, queryTrimmed);
        if (dniMatch.score > 0) {
          // Give DNI matches the highest score boost for exact matches
          const scoreBoost = customer.dni === queryTrimmed ? 50 : 20;
          newSuggestions.push({
            id: `dni-${customer.id}`,
            type: 'dni',
            label: `${customer.name} (DNI: ${customer.dni})`,
            value: customer.dni,
            customer,
            icon: CreditCard,
            score: dniMatch.score + scoreBoost,
            matches: dniMatch.matches
          });
        }
      }

      // Customer name suggestions
      const nameMatch = fuzzyMatch(customer.name, queryTrimmed);
      if (nameMatch.score > 0) {
        newSuggestions.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          label: customer.name,
          value: customer.name,
          customer,
          icon: User,
          score: nameMatch.score + 10, // Boost customer names
          matches: nameMatch.matches
        });
      }

      // Email suggestions
      if (customer.email) {
        const emailMatch = fuzzyMatch(customer.email, queryTrimmed);
        if (emailMatch.score > 0) {
          newSuggestions.push({
            id: `email-${customer.id}`,
            type: 'email',
            label: `${customer.name} (${customer.email})`,
            value: customer.email,
            customer,
            icon: Mail,
            score: emailMatch.score,
            matches: emailMatch.matches
          });
        }
      }


      // Phone suggestions
      if (customer.phone) {
        const phoneMatch = fuzzyMatch(customer.phone, queryTrimmed);
        if (phoneMatch.score > 0) {
          newSuggestions.push({
            id: `phone-${customer.id}`,
            type: 'phone',
            label: `${customer.name} (${customer.phone})`,
            value: customer.phone,
            customer,
            icon: Phone,
            score: phoneMatch.score,
            matches: phoneMatch.matches
          });
        }
      }

    });

    // Sort by score and limit results
    const sortedSuggestions = newSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setSuggestions(sortedSuggestions);
    setSelectedIndex(-1);
  }, [query, customers]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    onSearchChange(value);
    setIsOpen(true);
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    onSearchChange(suggestion.value);
    setIsOpen(false);
    
    if (onCustomerSelect && suggestion.customer) {
      onCustomerSelect(suggestion.customer);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    onSearchChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const highlightMatches = (text: string, matches: number[]) => {
    if (matches.length === 0) return text;

    const parts = [];
    let lastIndex = 0;

    matches.forEach(matchIndex => {
      if (matchIndex > lastIndex) {
        parts.push(text.slice(lastIndex, matchIndex));
      }
      parts.push(
        <mark key={matchIndex} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {text[matchIndex]}
        </mark>
      );
      lastIndex = matchIndex + 1;
    });

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              className="pl-10 pr-10"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={clearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[400px] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              {suggestions.length === 0 ? (
                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {suggestions.map((suggestion, index) => {
                    const Icon = suggestion.icon;
                    return (
                      <CommandItem
                        key={suggestion.id}
                        value={suggestion.value}
                        onSelect={() => handleSuggestionSelect(suggestion)}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          index === selectedIndex && "bg-accent"
                        )}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            {highlightMatches(suggestion.label, suggestion.matches)}
                          </div>
                          {suggestion.customer && (
                            <div className="text-xs text-muted-foreground truncate">
                              {suggestion.customer.email && (
                                <span className="mr-2">{suggestion.customer.email}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.type === 'customer' && 'Cliente'}
                          {suggestion.type === 'email' && 'Email'}
                          {suggestion.type === 'phone' && 'Teléfono'}
                        </Badge>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Enhanced search function with fuzzy matching
export function searchCustomersWithFuzzy(customers: Customer[], query: string): Customer[] {
  if (!query.trim()) return customers;

  const queryTrimmed = query.trim();
  const results: Array<{ customer: Customer; score: number }> = [];

  customers.forEach(customer => {
    let totalScore = 0;
    
    // Search in DNI (highest weight for exact matches)
    if (customer.dni) {
      const dniMatch = fuzzyMatch(customer.dni, queryTrimmed);
      // Give DNI matches extremely high weight, especially for exact matches
      const dniWeight = customer.dni === queryTrimmed ? 10 : 5;
      totalScore += dniMatch.score * dniWeight;
    }
    
    // Search in name (high weight)
    const nameMatch = fuzzyMatch(customer.name, queryTrimmed);
    totalScore += nameMatch.score * 3;
    
    // Search in email
    if (customer.email) {
      const emailMatch = fuzzyMatch(customer.email, queryTrimmed);
      totalScore += emailMatch.score * 2;
    }
    
    
    // Search in phone
    if (customer.phone) {
      const phoneMatch = fuzzyMatch(customer.phone, queryTrimmed);
      totalScore += phoneMatch.score;
    }
    
    // Search in address
    if (customer.address) {
      const addressMatch = fuzzyMatch(customer.address, queryTrimmed);
      totalScore += addressMatch.score;
    }
    
    // Search in notes
    if (customer.notes) {
      const notesMatch = fuzzyMatch(customer.notes, queryTrimmed);
      totalScore += notesMatch.score;
    }
    

    
    if (totalScore > 0) {
      results.push({ customer, score: totalScore });
    }
  });

  return results
    .sort((a, b) => b.score - a.score)
    .map(result => result.customer);
}