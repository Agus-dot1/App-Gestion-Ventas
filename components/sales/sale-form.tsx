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
import { AlertCircle, Plus, Trash2, ShoppingCart, User, CreditCard, Calculator, DollarSign, Search, Users, List } from 'lucide-react';
import { CustomerForm } from '@/components/customers/customer-form';
import { useDataCache } from '@/hooks/use-data-cache';
import type { Sale, Customer, Product, SaleFormData } from '@/lib/database-operations';
import { SelectLabel } from '@radix-ui/react-select';

interface SaleFormProps {
  sale?: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sale: SaleFormData) => void;
}

interface SaleItem {
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  line_total: number;
}

export function SaleForm({ sale, open, onOpenChange, onSave }: SaleFormProps) {
  const dataCache = useDataCache();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    customer_id: 0,
    payment_type: 'cash' as 'cash' | 'installments' | 'credit',
    payment_period: '1 to 10' as '1 to 10' | '20 to 30',
    period_type: 'monthly' as 'monthly' | 'weekly' | 'biweekly',
    number_of_installments: 6,
    advance_installments: 0,
    tax_amount: 0,
    discount_amount: 0,
    notes: ''
  });
  const [items, setItems] = useState<SaleItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [fullCustomerFormOpen, setFullCustomerFormOpen] = useState(false);

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
        payment_period: sale.payment_period || '1 to 10',
        period_type: sale.period_type || 'monthly',
        number_of_installments: sale.number_of_installments || 6,
        advance_installments: sale.advance_installments || 0,
        tax_amount: sale.tax_amount || 0,
        discount_amount: sale.discount_amount || 0,
        notes: sale.notes || ''
      });
      // Load sale items when editing
      loadSaleItems(sale.id!);
    } else {
      // Reset form for new sale
      setFormData({
        customer_id: 0,
        payment_type: 'cash',
        payment_period: '1 to 10',
        period_type: 'monthly',
        number_of_installments: 6,
        advance_installments: 0,
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

  const loadSaleItems = async (saleId: number) => {
    try {
      const saleItems = await window.electronAPI.database.saleItems.getBySale(saleId);
      const formattedItems: SaleItem[] = saleItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_per_item: item.discount_per_item || 0,
        line_total: item.line_total
      }));
      setItems(formattedItems);
    } catch (error) {
      console.error('Error cargando items de la venta:', error);
    }
  };

  const openProductDialog = () => {
    setProductQuery('');
    setProductDialogOpen(true);
  };

  const addItemFromProduct = (product: Product) => {
    const newItem: SaleItem = {
      product_id: product.id ?? null,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price,
      discount_per_item: 0,
      line_total: product.price
    };
    setItems(prev => [...prev, newItem]);
    setProductDialogOpen(false);
  };

  const addCustomProductByName = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const newItem: SaleItem = {
      product_id: null,
      product_name: cleanName,
      quantity: 1,
      unit_price: 0,
      discount_per_item: 0,
      line_total: 0
    };
    setItems(prev => [...prev, newItem]);
    setProductDialogOpen(false);
  };

  // Customer selection helpers (inside component scope)
  const openCustomerDialog = () => {
    setCustomerQuery('');
    setCustomerDialogOpen(true);
  };

  const selectCustomer = (customer: Customer) => {
    setFormData(prev => ({ ...prev, customer_id: customer.id! }));
    setCustomerDialogOpen(false);
  };

  const createCustomerQuick = async (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const existing = customers.find(c => c.name.toLowerCase() === clean.toLowerCase());
    if (existing) {
      selectCustomer(existing);
      return;
    }
    try {
      const id = await window.electronAPI.database.customers.create({ name: clean });
      const newCustomer: Customer = { id, name: clean } as Customer;
      setCustomers(prev => [...prev, newCustomer]);
      setFormData(prev => ({ ...prev, customer_id: id }));
      // Invalidate global customers cache so the Customers page refreshes
      dataCache.invalidateCache('customers');
    } catch (e) {
      console.error('Error creando cliente rápido:', e);
    } finally {
      setCustomerDialogOpen(false);
    }
  };

  const openFullCustomerForm = () => {
    setFullCustomerFormOpen(true);
  };

  const handleFullCustomerSave = async (payload: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const id = await window.electronAPI.database.customers.create(payload);
      const newCustomer: Customer = { id, ...payload } as Customer;
      setCustomers(prev => [...prev, newCustomer]);
      setFormData(prev => ({ ...prev, customer_id: id }));
      setFullCustomerFormOpen(false);
      setCustomerDialogOpen(false);
      // Invalidate global customers cache so the Customers page refreshes
      dataCache.invalidateCache('customers');
    } catch (e) {
      console.error('Error guardando cliente desde formulario:', e);
    }
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
      } else if (value == null) {
        // If product_id set to null, keep existing custom name and unit price
      }
    }
    
    // Recalculate line total
    const item = updatedItems[index];
    item.line_total = (item.quantity * item.unit_price) - item.discount_per_item;
    
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const total = subtotal - formData.discount_amount;
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payment_type = formData.payment_type;
      const saleData: SaleFormData = {
        customer_id: formData.customer_id,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_per_item: item.discount_per_item,
          product_name: item.product_name
        })),
        payment_type,
        payment_period: payment_type === 'installments' ? formData.payment_period : undefined,
        number_of_installments: payment_type === 'installments' ? formData.number_of_installments : undefined,
        advance_installments: payment_type === 'installments' ? formData.advance_installments : undefined,
        tax_amount: formData.tax_amount,
        discount_amount: formData.discount_amount,
        notes: formData.notes
      };
      
      await onSave(saleData);
      
      // Reset form - parent component will handle closing
      setFormData({
        customer_id: 0,
        payment_type: 'cash',
        payment_period: '1 to 10',
        period_type: 'monthly',
        number_of_installments: 6,
        advance_installments: 0,
        tax_amount: 0,
        discount_amount: 0,
        notes: ''
      });
      setItems([]);
      setErrors({});
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
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    {formData.customer_id ? (
                      <div className={`p-2 border rounded-md ${errors.customer_id ? 'border-red-500' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {customers.find(c => c.id === formData.customer_id)?.name || `ID ${formData.customer_id}`}
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={openCustomerDialog}>
                            Cambiar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={openCustomerDialog}
                          className={`${errors.customer_id ? 'border-red-500' : ''} w-full justify-between`}
                        >
                          <span className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Seleccionar cliente
                          </span>
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
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
                <Button type="button" onClick={openProductDialog} size="sm">
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
                        {item.product_id != null ? (
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
                        ) : (
                          <Input
                            placeholder="Nombre del producto"
                            value={item.product_name}
                            onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                          />
                        )}
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

          {/* Product Search Dialog */}
          <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Buscar producto
                </DialogTitle>
                <DialogDescription>
                  Busca en el catálogo o crea un producto personalizado.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Escribe para buscar..."
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  {products
                    .filter(p => p.name.toLowerCase().includes(productQuery.toLowerCase()))
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-muted flex items-center justify-between"
                        onClick={() => addItemFromProduct(p)}
                      >
                        <span>{p.name}</span>
                        <span className="text-muted-foreground">${p.price}</span>
                      </button>
                    ))}
                  {products.filter(p => p.name.toLowerCase().includes(productQuery.toLowerCase())).length === 0 && (
                    <div className="px-4 py-6 text-center text-muted-foreground">
                      No hay resultados.
                    </div>
                  )}
                </div>
                {productQuery.trim() && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-muted-foreground">
                      ¿No encuentras el producto?
                    </div>
                    <Button type="button" onClick={() => addCustomProductByName(productQuery)}>
                      Usar "{productQuery}" como producto
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setProductDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Customer Search Dialog */}
          <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Buscar cliente
                </DialogTitle>
                <DialogDescription>
                  Busca y selecciona un cliente existente, crea uno por nombre o abre el formulario completo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Escribe para buscar..."
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                  />
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-md">
                  {customers
                    .filter(c => c.name.toLowerCase().includes(customerQuery.toLowerCase()))
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-muted flex items-center justify-between"
                        onClick={() => selectCustomer(c)}
                      >
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" /> {c.name}
                        </span>
                        {c.dni && <span className="text-muted-foreground text-sm">DNI: {c.dni}</span>}
                      </button>
                    ))}
                  {customers.filter(c => c.name.toLowerCase().includes(customerQuery.toLowerCase())).length === 0 && (
                    <div className="px-4 py-6 text-center text-muted-foreground">
                      No hay resultados.
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="outline" onClick={openFullCustomerForm}>
                    Abrir formulario completo
                  </Button>
                  {customerQuery.trim() && (
                    <Button type="button" onClick={() => createCustomerQuick(customerQuery)}>
                      Usar "{customerQuery}" como cliente
                    </Button>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCustomerDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Full Customer Form */}
          <CustomerForm
            open={fullCustomerFormOpen}
            onOpenChange={setFullCustomerFormOpen}
            onSave={handleFullCustomerSave}
          />

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
                      <SelectItem value="installments">
                        <div className="flex items-center gap-2">
                          Cuotas
                        </div>
                      </SelectItem>
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
                 <div>
                 {formData.payment_type === 'installments' && formData.number_of_installments > 0 && (
                  <>
                    <Label>Periodo de pago</Label>
                    <Select
                      value={formData.payment_period}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_period: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1 to 10">1 al 10</SelectItem>
                        <SelectItem value="20 to 30">20 al 30</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              </div>


                              {formData.payment_type === 'installments' && formData.number_of_installments > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label>Cuotas pagadas por adelantado</Label>
                      <Select
                        value={formData.advance_installments.toString()}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, advance_installments: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: formData.number_of_installments + 1 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 0 ? 'Ninguna' : `${i} cuota${i > 1 ? 's' : ''}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  </>
                )}
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
                        <span>Pago mensual:</span>
                        <span>${Math.round(total / formData.number_of_installments)}</span>
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