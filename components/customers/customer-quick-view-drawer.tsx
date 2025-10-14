'use client';

import * as React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Customer } from '@/lib/database-operations';
import { Mail, Phone, MapPin, Tag, User, Edit, X } from 'lucide-react';

interface CustomerQuickViewDrawerProps {
  open: boolean;
  customer: Customer;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
}

export function CustomerQuickViewDrawer({ open, customer, onClose, onEdit }: CustomerQuickViewDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {customer.name}
          </DrawerTitle>
          <DrawerDescription>
            {customer.created_at ? `Cliente desde ${new Date(customer.created_at).toLocaleDateString()}` : 'Fecha desconocida'}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="px-4">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.address}</span>
                  </div>
                )}
                {customer.tags && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{customer.tags}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {customer.notes && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{customer.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DrawerFooter>
          <Button
            onClick={() => onEdit(customer)}
            variant="default"
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <DrawerClose asChild>
            <Button onClick={onClose} variant="outline">
              <X className="mr-2 h-4 w-4" />
              Cerrar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}