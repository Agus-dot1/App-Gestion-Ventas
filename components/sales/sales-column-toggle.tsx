'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings2 } from 'lucide-react';

export interface ColumnVisibility {
  sale_number: boolean;
  customer_name: boolean;
  date: boolean;
  payment_type: boolean;
  total_amount: boolean;
  payment_status: boolean;
  reference_code: boolean;
}

interface SalesColumnToggleProps {
  columnVisibility: ColumnVisibility;
  onColumnVisibilityChange: (visibility: ColumnVisibility) => void;
}

const columnLabels: Record<keyof ColumnVisibility, string> = {
  sale_number: 'Productos',
  customer_name: 'Cliente',
  date: 'Fecha',
  payment_type: 'Método de pago',
  total_amount: 'Total',
  payment_status: 'Estado del pago',
  reference_code: 'Referencia'
};

export function SalesColumnToggle({ columnVisibility, onColumnVisibilityChange }: SalesColumnToggleProps) {
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
              onCheckedChange={(checked) => handleColumnToggle(columnKey, checked)}
            >
              {label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}