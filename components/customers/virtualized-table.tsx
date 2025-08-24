'use client';

import { useState, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Users, Phone, Calendar, Mail, Building, Tag, Eye } from 'lucide-react';
import type { Customer } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

interface VirtualizedTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: number) => Promise<void>;
  onViewProfile: (customer: Customer) => void;
  highlightId?: string | null;
}

interface RowData {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customerId: number) => Promise<void>;
  onViewProfile: (customer: Customer) => void;
  highlightId?: string | null;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function CustomerRow({ index, style, data }: { index: number; style: any; data: RowData }) {
  const { customers, onEdit, onDelete, onViewProfile, highlightId } = data;
  const customer = customers[index];

  const handleDeleteClick = async () => {
    if (customer.id && window.confirm(`¿Estás seguro de que querés eliminar a ${customer.name}?`)) {
      await onDelete(customer.id);
    }
  };

  return (
    <div
      style={style}
      className={cn(
        "flex items-center border-b border-border px-4 py-3 hover:bg-muted/50",
        highlightId === customer.id?.toString() && "bg-yellow-50 border-yellow-200"
      )}
    >
      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-7 lg:gap-4 w-full items-center">
        <div className="font-medium">{customer.name}</div>
        <div className="text-sm text-muted-foreground">
          {customer.email || 'Sin email'}
        </div>
        <div className="text-sm text-muted-foreground">
          {customer.phone || 'Sin teléfono'}
        </div>
        <div className="text-sm text-muted-foreground">
          {customer.company || 'Sin empresa'}
        </div>
        <div>
          {customer.tags && customer.tags.length > 0 ? (() => {
            const tagsArray = customer.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            return (
              <div className="flex flex-wrap gap-1">
                {tagsArray.slice(0, 2).map((tag, tagIndex) => (
                  <Badge key={tagIndex} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {tagsArray.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{tagsArray.length - 2}
                  </Badge>
                )}
              </div>
            );
          })() : (
            <span className="text-muted-foreground/60">Sin etiquetas</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          {customer.created_at ? formatDate(customer.created_at) : 'Unknown'}
        </div>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewProfile(customer)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(customer)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden w-full">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold">{customer.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="w-4 h-4" />
              {customer.created_at ? formatDate(customer.created_at) : 'Unknown'}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewProfile(customer)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(customer)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteClick}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="space-y-1 text-sm">
          {customer.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.company && (
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span>{customer.company}</span>
            </div>
          )}
          {customer.tags && customer.tags.length > 0 && (() => {
            const tagsArray = customer.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            return (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {tagsArray.slice(0, 3).map((tag, tagIndex) => (
                    <Badge key={tagIndex} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {tagsArray.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{tagsArray.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export function VirtualizedCustomersTable({ customers, onEdit, onDelete, onViewProfile, highlightId }: VirtualizedTableProps) {
  const rowData: RowData = {
    customers,
    onEdit,
    onDelete,
    onViewProfile,
    highlightId
  };

  if (customers.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
            <p className="text-muted-foreground mb-4">
              Empezá añadiendo tu primer cliente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes ({customers.length.toLocaleString()})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Header */}
        <div className="hidden lg:grid lg:grid-cols-7 lg:gap-4 px-4 py-3 border-b bg-muted/50 font-medium text-sm">
          <div>Nombre</div>
          <div>Email</div>
          <div>Teléfono</div>
          <div>Empresa</div>
          <div>Etiquetas</div>
          <div>Fecha de creación</div>
          <div className="text-right">Acciones</div>
        </div>
        
        {/* Virtualized List */}
        <List
          height={600}
          width="100%"
          itemCount={customers.length}
          itemSize={120} // Increased for mobile layout
          itemData={rowData}
          className="border-0"
        >
          {CustomerRow}
        </List>
      </CardContent>
    </Card>
  );
}