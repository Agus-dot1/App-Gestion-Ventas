"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CreditCard, DollarSign, Calendar as CalendarIcon } from "lucide-react"
import type { Installment } from "@/lib/database-operations"
import dynamic from "next/dynamic"
import { es } from "date-fns/locale"

type PaymentMethod = "cash" | "credit_card" | "debit_card" | "bank_transfer" | "check"

export function InstallmentPaymentDialog({
  open,
  installment,
  onOpenChange,
  onSuccess,
  initialPaymentDate,
}: {
  open: boolean
  installment: Installment | null
  onOpenChange: (open: boolean) => void
  onSuccess?: (updated: Installment) => void
  initialPaymentDate?: string
}) {
  const balance = useMemo(() => Math.max(0, (installment?.amount || 0) - (installment?.paid_amount || 0)), [installment])
  const [amount, setAmount] = useState<number>(0)
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentDate, setPaymentDate] = useState<Date>(initialPaymentDate ? new Date(initialPaymentDate) : new Date())
  const [note, setNote] = useState<string>("")
  const [saleInstallments, setSaleInstallments] = useState<Installment[]>([])
  const [saleTotals, setSaleTotals] = useState<{ total: number; paid: number; pending: number; remainingCount: number }>({ total: 0, paid: 0, pending: 0, remainingCount: 0 })
  useEffect(() => {
    setPaymentDate(initialPaymentDate ? new Date(initialPaymentDate) : new Date())
  }, [initialPaymentDate])

  const formatCurrency = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n)

  const parseISOToLocalDate = (iso: string) => {
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(iso))
    if (m) {
      const y = Number(m[1])
      const mo = Number(m[2]) - 1
      const d = Number(m[3])
      return new Date(y, mo, d)
    }
    return new Date(iso)
  }
  const formatISODateDisplay = (iso: string) => parseISOToLocalDate(iso).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
  const formatDateDisplay = (d: Date) => d.toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })

  const resetLocal = () => {
    setAmount(0)
    setMethod("cash")
    setPaymentDate(new Date())
    setNote("")
  }

  useEffect(() => {
    const loadTotals = async () => {
      try {
        if (!installment) return
        const insts = await window.electronAPI.database.installments.getBySale(installment.sale_id)
        setSaleInstallments(insts || [])
        const total = (insts || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
        const paid = (insts || []).reduce((sum: number, i: any) => sum + (i.paid_amount || 0), 0)
        const pending = (insts || []).reduce((sum: number, i: any) => sum + (i.balance || 0), 0)
        const remainingCount = (insts || []).filter((i: any) => i.status !== 'paid').length
        setSaleTotals({ total, paid, pending, remainingCount })
      } catch {}
    }
    loadTotals()
  }, [installment])

  const handleFullPayment = () => setAmount(balance)

  const toISODateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`
  }

  const handleSubmit = async () => {
    if (!installment) return
    if (amount <= 0) {
      toast.error("Ingresá un monto válido")
      return
    }
    if (amount > balance) {
      toast.error("El monto supera el balance pendiente")
      return
    }
    if (paymentDate.getTime() > Date.now()) {
      toast.error("La fecha de pago no puede ser futura")
      return
    }
    try {
      setIsSubmitting(true)
      await window.electronAPI.database.installments.recordPayment(installment.id!, amount, method, note || undefined, toISODateLocal(paymentDate))
      toast.success("Pago registrado correctamente")
      const remainingBefore = installment.balance ?? Math.max(0, installment.amount - (installment.paid_amount || 0))
      const remainingAfter = Math.max(0, remainingBefore - amount)
      const updated: Installment = {
        ...installment,
        paid_amount: (installment.paid_amount || 0) + amount,
        balance: remainingAfter,
        status: remainingAfter === 0 ? "paid" : "pending",
        paid_date: remainingAfter === 0 ? toISODateLocal(paymentDate) : installment.paid_date,
      }
      onSuccess?.(updated)
      resetLocal()
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error("No se pudo registrar el pago")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCalendarSelect = useCallback((d?: Date) => {
    if (!d) return
    setPaymentDate(d)
  }, [])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetLocal(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-[98vw] lg:max-w-[75vw] xl:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>Registrar un pago para la cuota #{installment?.installment_number}</DialogDescription>
        </DialogHeader>

        

        <div className="mt-4 grid gap-6 md:grid-cols-12">
          {/* Left: Amount + Method */}
          <div className="md:col-span-4">
            <Card className="h-full">
              <CardContent className="p-4 space-y-4">
                <div className="text-sm font-semibold">Información de pago</div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Monto del Pago *</div>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" min={0} step={1} value={amount || ''} onChange={(e) => setAmount(Math.round(parseFloat(e.target.value || '0')))} className="pl-10" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="secondary" onClick={handleFullPayment}>Pago Completo</Button>
                    <Button type="button" variant="outline" onClick={() => setAmount(Math.max(1, Math.round((balance || 0) / 2)))}>50%</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Método de Pago *</div>
                  <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                      <SelectItem value="debit_card">Tarjeta de Débito</SelectItem>
                      <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Nota</div>
                  <Textarea rows={3} placeholder="Agregar una nota para este pago" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle: Calendar */}
          <div className="md:col-span-4">
            <Card className="h-full">
              <CardContent className="p-4 flex items-center flex-col justify-center space-y-3">
                <div className="text-sm font-semibold">Fecha de pago</div>
                <div className="border rounded-md p-1 flex items-center justify-center">
                  <CalendarComp locale={es} mode="single" selected={paymentDate} onSelect={handleCalendarSelect} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Resume */}
          <div className="md:col-span-4">
            {installment && (
              <Card className="bg-[#1a1a1a] h-full">
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm font-semibold">Resumen</div>
                  <div className="border rounded-md p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        <div>Fecha seleccionada: {formatDateDisplay(paymentDate)}</div>
                        <div>Método: {method === 'cash' ? 'Efectivo' : method === 'credit_card' ? 'Tarjeta de Crédito' : method === 'debit_card' ? 'Tarjeta de Débito' : method === 'bank_transfer' ? 'Transferencia Bancaria' : 'Cheque'}</div>
                        <div>Monto a registrar: {formatCurrency(amount || 0)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-foreground/90">Cuota</div>
                        <div className="font-medium text-foreground">#{installment.installment_number}</div>
                      </div>
                      <div className="pl-4 border-l border-muted">
                        <div className="text-foreground/90 flex items-center gap-1"><CalendarIcon className="h-4 w-4" /> Vencimiento</div>
                        <div className="font-medium text-foreground">{formatISODateDisplay(installment.due_date)}</div>
                      </div>
                      <div>
                        <div className="text-foreground/90">Monto Total</div>
                        <div className="font-mono font-semibold">{formatCurrency(installment.amount)}</div>
                      </div>
                      <div className="pl-4 border-l border-muted">
                        <div className="text-foreground/90">Ya Pagado</div>
                        <div className="font-mono">{formatCurrency(installment.paid_amount)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-foreground/90">Total Venta</div>
                        <div className="font-mono">{formatCurrency(saleTotals.total)}</div>
                      </div>
                      <div className="pl-4 border-l border-muted">
                        <div className="text-foreground/90">Pendiente</div>
                        <div className="font-mono">{formatCurrency(saleTotals.pending)}</div>
                      </div>
                      <div>
                        <div className="text-foreground/90">Pagado</div>
                        <div className="font-mono">{formatCurrency(saleTotals.paid)}</div>
                      </div>
                      <div className="pl-4 border-l border-muted">
                        <div className="text-foreground/90">Cuotas restantes</div>
                        <div className="font-mono">{saleTotals.remainingCount}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 border rounded-md flex items-center justify-between">
                    <div className="text-sm text-foreground/90">Balance Pendiente</div>
                    <div className="font-mono text-lg font-bold">{formatCurrency(balance)}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancelar</Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !installment}>Registrar Pago</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
const CalendarComp = dynamic(() => import("@/components/ui/calendar").then(m => m.Calendar), { ssr: false })
