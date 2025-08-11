'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Trash2, ShoppingCart, User, CreditCard, Calculator, DollarSign } from 'lucide-react';
import type { Sale, Customer, Product, SaleFormData } from '@/lib/database-operations';

interface SaleFormProps {
  sale?: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sale: SaleFormData) => void;
}

interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  line_total: number;
}

export function SaleForm({ sale, open, onOpenChange, onSave }: SaleFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    customer_id: 0,
    payment_type: 'cash' as 'cash' | 'installments' | 'credit' | 'mixed',
    number_of_installments: 6,
    down_payment: 0,
    tax_amount: 0,
    discount_amount: 0,
    notes: ''
  });
  const [items, setItems] = useState<SaleItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && typeof window !== 'undefined' && window.electronAPI) {
      loadCustomers();
      loadProducts();
    }
  }, [open]);

  useEffect(() => {
    if (sale) {
      setFormData({
        customer_id: sale.customer_id,
        payment_type: sale.payment_type,
        number_of_installments: sale.number_of_installments || 6,
        down_payment: sale.down_payment,
        tax_amount: sale.tax_amount,
        discount_amount: sale.discount_amount,
        notes: sale.notes || ''
      });
      // Note: For editing, we'd need to load the sale items
      // This is a simplified version for new sales
    } else {
      // Reset form for new sale
      setFormData({
        customer_id: 0,
        payment_type: 'cash',
        number_of_installments: 6,
        down_payment: 0,
        tax_amount: 0,
        discount_amount: 0,
        notes: ''
      });
      setItems([]);
    }
  }, [sale]);

  const loadCustomers = async () => {
    try {
      const allCustomers = await window.electronAPI.database.customers.getAll();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const activeProducts = await window.electronAPI.database.products.getActive();
      setProducts(activeProducts);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const addItem = () => {
    if (products.length === 0) return;
    
    const firstProduct = products[0];
    const newItem: SaleItem = {
      product_id: firstProduct.id!,
      product_name: firstProduct.name,
      quantity: 1,
      unit_price: firstProduct.price,
      discount_per_item: 0,
      line_total: firstProduct.price
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Update product name and price when product changes
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].product_name = product.name;
        updatedItems[index].unit_price = product.price;
      }
    }
    
    // Recalculate line total
    const item = updatedItems[index];
    item.line_total = (item.quantity * item.unit_price) - item.discount_per_item;
    
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const total = subtotal + formData.tax_amount - formData.discount_amount;
    return { subtotal, total };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) {
      newErrors.customer_id = 'Selecciona un cliente';
    }

    if (items.length === 0) {
      newErrors.items = 'Agrega al menos un producto a la venta';
    }

    items.forEach((item, index) => {
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'La cantidad debe ser mayor a 0';
      }
      if (item.unit_price < 0) {
        newErrors[`item_${index}_price`] = 'El precio unitario no puede ser negativo';
      }
    });

    if (formData.payment_type === 'installments') {
      if (!formData.number_of_installments || formData.number_of_installments < 2) {
        newErrors.number_of_installments = 'El número de cuotas debe ser al menos 2';
      }
      if (formData.down_payment < 0) {
        newErrors.down_payment = 'La seña no puede ser negativa';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const saleData: SaleFormData = {
        customer_id: formData.customer_id,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_per_item: item.discount_per_item
        })),
        payment_type: formData.payment_type,
        number_of_installments: formData.payment_type === 'installments' ? formData.number_of_installments : undefined,
        down_payment: formData.payment_type === 'installments' ? formData.down_payment : undefined,
        tax_amount: formData.tax_amount,
        discount_amount: formData.discount_amount,
        notes: formData.notes
      };
      
      await onSave(saleData);
      
      // Reset form
      setFormData({
        customer_id: 0,
        payment_type: 'cash',
        number_of_installments: 6,
        down_payment: 0,
        tax_amount: 0,
        discount_amount: 0,
        notes: ''
      });
      setItems([]);
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      console.error('Error al registrar venta:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, total } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {sale ? 'Editar venta' : 'Crear venta'}
          </DialogTitle>
          <DialogDescription>
            {sale ? 'Actualizar información de la venta.' : 'Crear una nueva venta.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-4 w-4" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="customer">Cliente *</Label>
                <Select
                  value={formData.customer_id.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, customer_id: parseInt(value) }))}
                >
                  <SelectTrigger className={errors.customer_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id!.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {customer.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customer_id && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.customer_id}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingCart className="h-4 w-4" />
                  Productos en la venta
                </CardTitle>
                <Button type="button" onClick={addItem} size="sm" disabled={products.length === 0}>
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir Producto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No añadiste ningún producto.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-end gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label>Producto</Label>
                        <Select
                          value={item.product_id.toString()}
                          onValueChange={(value) => updateItem(index, 'product_id', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id!.toString()}>
                                {product.name} - ${product.price}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-24">
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className={errors[`item_${index}_quantity`] ? 'border-red-500' : ''}
                        />
                      </div>
                      
                      <div className="w-32">
                        <Label>Precio unitario</Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className={errors[`item_${index}_price`] ? 'border-red-500' : ''}
                        />
                      </div>
                      
                      <div className="w-32">
                        <Label>Descuento</Label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={item.discount_per_item}
                          onChange={(e) => updateItem(index, 'discount_per_item', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="w-32">
                        <Label>Total</Label>
                        <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                          ${item.line_total}
                        </div>
                      </div>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {errors.items && (
                <div className="flex items-center gap-1 text-sm text-red-600 mt-2">
                  <AlertCircle className="h-3 w-3" />
                  {errors.items}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-4 w-4" />
                Información de pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Método de pago</Label>
                  <Select
                    value={formData.payment_type}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="installments">Cuotas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.payment_type === 'installments' && (
                  <>
                    <div>
                      <Label>Cantidad de cuotas</Label>
                      <Input
                        type="number"
                        min="2"
                        max="60"
                        value={formData.number_of_installments}
                        onChange={(e) => setFormData(prev => ({ ...prev, number_of_installments: parseInt(e.target.value) || 6 }))}
                        className={errors.number_of_installments ? 'border-red-500' : ''}
                      />
                      {errors.number_of_installments && (
                        <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.number_of_installments}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label>Seña</Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={formData.down_payment}
                        onChange={(e) => setFormData(prev => ({ ...prev, down_payment: parseFloat(e.target.value) || 0 }))}
                        className={errors.down_payment ? 'border-red-500' : ''}
                      />
                      {errors.down_payment && (
                        <div className="flex items-center gap-1 text-sm text-red-600 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          {errors.down_payment}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Descuento</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_amount: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="h-4 w-4" />
                Resumen de la venta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${Math.round(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Descuento:</span>
                  <span>-${Math.round(formData.discount_amount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${Math.round(total)}</span>
                </div>
                
                {formData.payment_type === 'installments' && formData.number_of_installments > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Seña:</span>
                        <span>${Math.round(formData.down_payment)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total restante:</span>
                        <span>${Math.round((total - formData.down_payment))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pago mensual:</span>
                        <span>${Math.round((total - formData.down_payment) / formData.number_of_installments)}</span>

                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Nota adicional para la venta..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || items.length === 0}>
              {isSubmitting ? 'Creando venta...' : sale ? 'Actualizar venta' : 'Crear venta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}