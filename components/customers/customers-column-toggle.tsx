'use client';

import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';

export interface ColumnVisibility {
  name: boolean;
  dni: boolean;
  contact: boolean;
  address: boolean;
  created_at: boolean;
}

interface CustomersColumnToggleProps {
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
}

const columnLabels: Record<keyof ColumnVisibility, string> = {
  name: 'Nombre',
  dni: 'DNI',
  contact: 'Contacto',
  address: 'Dirección',
  created_at: 'Fecha de alta'
};

export function CustomersColumnToggle({ columnVisibility, onColumnVisibilityChange }: CustomersColumnToggleProps) {
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
      <DropdownMenuContent align="end" className="w-[220px]">
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