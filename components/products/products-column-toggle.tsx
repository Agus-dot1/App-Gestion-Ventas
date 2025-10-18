'use client';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';

export interface ColumnVisibility {
  name: boolean;
  category: boolean;
  price: boolean;
  stock: boolean;
  description: boolean;
  status: boolean;
}

interface ProductsColumnToggleProps {
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
}

const columnLabels: Record<keyof ColumnVisibility, string> = {
  name: 'Nombre',
  category: 'Categoría',
  price: 'Precio',
  stock: 'Stock',
  description: 'Descripción',
  status: 'Estado'
};

export function ProductsColumnToggle({ columnVisibility, onColumnVisibilityChange }: ProductsColumnToggleProps) {
  const handleColumnToggle = (column: keyof ColumnVisibility, checked: boolean) => {
    onColumnVisibilityChange({
      ...columnVisibility,
      [column]: checked
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto">
          <Settings2 className="mr-2 h-4 w-4" />
          Columnas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Mostrar columnas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(columnLabels).map(([key, label]) => {
          const columnKey = key as keyof ColumnVisibility;
          return (
            <DropdownMenuCheckboxItem
              key={key}
              className="capitalize"
              checked={columnVisibility[columnKey]}
              onCheckedChange={(checked) => handleColumnToggle(columnKey, !!checked)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}