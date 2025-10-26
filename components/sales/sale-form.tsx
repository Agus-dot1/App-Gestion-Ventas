'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Trash2, ShoppingCart, User, CreditCard, Calculator, Search, Users, List } from 'lucide-react';
type Sale = any;
type Customer = any;
type Product = any;
type SaleFormData = any;

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    customer_id: 0,
    payment_type: 'cash' as 'cash' | 'installments',
    payment_period: '1 to 10' as '1 to 10' | '20 to 30',
    period_type: 'monthly' as 'monthly' | 'weekly' | 'biweekly',
    number_of_installments: 6,
    advance_installments: 0,
    tax_amount: 0,
    installment_payment_method: 'cash' as 'cash' | 'transfer',
    notes: ''
  });
  const [items, setItems] = useState<SaleItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');

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
        installment_payment_method: (sale.installment_payment_method as 'cash' | 'transfer') || 'cash',
        notes: sale.notes || ''
      });
      loadSaleItems(sale.id!);
    } else {
      setFormData({
        customer_id: 0,
        payment_type: 'cash',
        payment_period: '1 to 10',
        period_type: 'monthly',
        number_of_installments: 6,
        advance_installments: 0,
        tax_amount: 0,
        installment_payment_method: 'cash',
        notes: ''
      });
      setItems([]);
    }
  }, [sale]);

  const loadCustomers = async () => {
    try {
      if (!window.electronAPI) return;
      const allCustomers = await window.electronAPI.database.customers.getAll();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const loadProducts = async () => {
    try {
      if (!window.electronAPI) return;
      const activeProducts = await window.electronAPI.database.products.getActive();
      setProducts(activeProducts);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const loadSaleItems = async (saleId: number) => {
    try {
      if (!window.electronAPI) return;
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
      if (!window.electronAPI) return;
      const id = await window.electronAPI.database.customers.create({ name: clean });
      const newCustomer: Customer = { id, name: clean } as Customer;
      setCustomers(prev => [...prev, newCustomer]);
      setFormData(prev => ({ ...prev, customer_id: id }));
    } catch (e) {
      console.error('Error creando cliente rápido:', e);
    } finally {
      setCustomerDialogOpen(false);
    }
  };


  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].product_name = product.name;
        updatedItems[index].unit_price = product.price;
      }
    }

    const item = updatedItems[index];
    item.line_total = (item.quantity * item.unit_price) - item.discount_per_item;

    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const total = subtotal; // no sale-level discount
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
        installment_payment_method: payment_type === 'installments' ? formData.installment_payment_method : undefined,
        tax_amount: formData.tax_amount,
        notes: formData.notes
      };

      await onSave(saleData);

      setFormData({
        customer_id: 0,
        payment_type: 'cash',
        payment_period: '1 to 10',
        period_type: 'monthly',
        number_of_installments: 6,
        advance_installments: 0,
        tax_amount: 0,
        installment_payment_method: 'cash',
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
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-x-auto overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {sale ? 'Editar venta' : 'Crear venta'}
          </DialogTitle>
          <DialogDescription>
            {sale ? 'Actualizar información de la venta.' : 'Crear una nueva venta.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 min-w-[1200px]">
          <div className="flex gap-6">
            <div className="flex-1 space-y-6">
              {/* Cliente y Pago lado a lado */}
              <div className="grid grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-4 w-4" />
                  <h3 className="font-semibold">Información del Cliente</h3>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs mb-1.5 block">Cliente *</Label>
                    {formData.customer_id ? (
                      <div className={`h-10 px-3 border rounded-md flex items-center justify-between text-sm ${errors.customer_id ? 'border-red-500' : ''}`}>
                        <span className="truncate flex-1">{customers.find(c => c.id === formData.customer_id)?.name || `ID ${formData.customer_id}`}</span>
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={openCustomerDialog}>
                          Cambiar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openCustomerDialog}
                        className={`${errors.customer_id ? 'border-red-500' : ''} w-full justify-between h-10 text-sm`}
                      >
                        <span className="flex items-center gap-2">
                          <Search className="h-3 w-3" />
                          Seleccionar
                        </span>
                        <List className="h-3 w-3" />
                      </Button>
                    )}
                    {errors.customer_id && (
                      <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.customer_id}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pago */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-4 w-4" />
                  <h3 className="font-semibold">Información de pago</h3>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">Método de pago</Label>
                    <Select
                      value={formData.payment_type}
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_type: value }))}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Al contado</SelectItem>
                        <SelectItem value="installments">Cuotas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.payment_type === 'installments' && (
                    <>
                      <div>
                        <Label className="text-xs mb-1.5 block">Cantidad de cuotas</Label>
                        <Input
                          type="number"
                          min="2"
                          max="60"
                          value={formData.number_of_installments}
                          onChange={(e) => setFormData(prev => ({ ...prev, number_of_installments: parseInt(e.target.value) || 6 }))}
                          className={`h-10 ${errors.number_of_installments ? 'border-red-500' : ''}`}
                        />
                      </div>

                      <div>
                        <Label className="text-xs mb-1.5 block">Periodo de pago</Label>
                        <Select
                          value={formData.payment_period}
                          onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_period: value }))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1 to 10">1 al 10</SelectItem>
                            <SelectItem value="20 to 30">20 al 30</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs mb-1.5 block">Método de pago de cuotas</Label>
                        <Select
                          value={formData.installment_payment_method}
                          onValueChange={(value: any) => setFormData(prev => ({ ...prev, installment_payment_method: value }))}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="transfer">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <h3 className="font-semibold">Productos</h3>
                  </div>
                  <Button type="button" onClick={openProductDialog} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">No añadiste ningún producto.</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left text-xs font-medium p-3 w-[35%]">Producto</th>
                          <th className="text-left text-xs font-medium p-3 w-[12%]">Cantidad</th>
                          <th className="text-left text-xs font-medium p-3 w-[15%]">Precio unit.</th>
                          <th className="text-left text-xs font-medium p-3 w-[15%]">Descuento</th>
                          <th className="text-left text-xs font-medium p-3 w-[15%]">Total</th>
                          <th className="text-left text-xs font-medium p-3 w-[8%]"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">
                              {item.product_id != null ? (
                                <Select
                                  value={item.product_id.toString()}
                                  onValueChange={(value) => updateItem(index, 'product_id', parseInt(value))}
                                >
                                  <SelectTrigger className="h-9 text-sm">
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
                                  className="h-9 text-sm"
                                />
                              )}
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className={`h-9 text-sm ${errors[`item_${index}_quantity`] ? 'border-red-500' : ''}`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                className={`h-9 text-sm ${errors[`item_${index}_price`] ? 'border-red-500' : ''}`}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={item.discount_per_item}
                                onChange={(e) => updateItem(index, 'discount_per_item', parseFloat(e.target.value) || 0)}
                                className="h-9 text-sm"
                              />
                            </td>
                            <td className="p-2">
                              <div className="h-9 px-3 py-2 border rounded-md bg-muted flex items-center text-sm font-medium">
                                ${item.line_total}
                              </div>
                            </td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {errors.items && (
                  <div className="flex items-center gap-1 text-sm text-red-600 mt-2">
                    <AlertCircle className="h-3 w-3" />
                    {errors.items}
                  </div>
                )}
              </div>

            </div>

            <div className="w-64 shrink-0 space-y-4">
              <div className="border rounded-lg p-4 sticky top-0 bg-background">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="h-4 w-4" />
                  <h3 className="font-semibold">Resumen</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">${Math.round(subtotal)}</span>
                  </div>

                  {/* Removed Descuento display */}

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">${Math.round(total)}</span>
                  </div>

                  {formData.payment_type === 'installments' && formData.number_of_installments > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2 pt-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2">Detalles de cuotas</div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pago mensual:</span>
                          <span className="font-semibold text-blue-600">${Math.round(total / formData.number_of_installments)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total cuotas:</span>
                          <span className="font-medium">{formData.number_of_installments}</span>
                        </div>

                      </div>
                    </>
                  )}
                </div>
                

              </div>
                <div>
                <Label className="text-xs mb-1.5 block">Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Nota adicional para la venta..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
              {formData.payment_type === 'installments' && (
                  <div className="w-full">
                    <div>
                      <Label className="text-xs mb-1.5 block">Pago anticipado</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Monto"
                        className="h-10"
                      />
                    </div>
                  </div>
                )}
            </div>
          </div>

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
                {customerQuery.trim() && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-muted-foreground">
                      ¿No encuentras el cliente?
                    </div>
                    <Button type="button" onClick={() => createCustomerQuick(customerQuery)}>
                      Usar "{customerQuery}" como cliente
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCustomerDialogOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


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
