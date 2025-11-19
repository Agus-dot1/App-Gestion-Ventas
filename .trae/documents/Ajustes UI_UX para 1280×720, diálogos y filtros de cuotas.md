## Objetivo
- Mejorar legibilidad y uso en pantallas 1280×720.
- Rediseñar el diálogo de cuotas según el diseño adjunto (Registrar Pago) y compactar diálogos existentes.
- Evitar que notificaciones tapen botones, con cierre más rápido.
- Agregar la ventana 10–20 en filtros y lógica del dashboard.

## Diálogos (Cuotas y Pago)
1. Crear `components/sales/installments-dashboard/installment-payment-dialog.tsx` inspirado en shadcn Dialog.
   - Encabezado: información de cuota (número, vencimiento, monto total, pagado, balance).
   - Campos: `Monto del Pago` (con máscara moneda), botón rápido “Pago Completo” (100%).
   - Método de pago: `Select` con opciones existentes.
   - Botones: `Cancelar` y `Registrar Pago`.
   - Conectar a `window.electronAPI.database.installments.recordPayment(...)` (electron/preload.js:60 y lib/database-operations.ts:1633) para pagos completos.
   - Mostrar validaciones y toasts de éxito/error.
2. Ajustar `InstallmentForm` para modo compacto:
   - Reducir padding y alturas (`sm`), asegurar `max-h-[80vh] overflow-y-auto` (hoy: components/sales/installment-form.tsx:191–195, 193).
   - Subir contraste de números (clases `text-foreground` y `font-medium`).
3. Acciones del dashboard:
   - Reemplazar “Marcar Pagada” por “Registrar Pago” o añadir ambos (components/sales/installments-dashboard/installment-dashboard.tsx:1505–1513).
   - Abrir `InstallmentPaymentDialog` pasando la cuota seleccionada.

## Notificaciones (Sonner)
1. Configurar Toaster global a:
   - `position="bottom-right"` (ya está en app/layout.tsx:34).
   - `offset={64}` para separarlo de los botones; duración por defecto `duration={2200}`; `closeButton` opcional.
   - Aplicar en wrapper `components/ui/sonner.tsx` permitiendo props por defecto.
2. Estándar de uso:
   - `toast.success(..., { duration: 2000 })`, `toast.error(..., { duration: 4500 })` en puntos críticos del dashboard (installment-dashboard.tsx:252, 313, 871, etc.).

## Filtros (ventana 10–20)
1. UI: agregar la opción “Cobros del 10–20” al `Select` de ventana (components/sales/installments-dashboard/installment-dashboard.tsx:1109–1112).
2. Lógica:
   - Incluir 10–20 en `getEffectivePaymentWindow` y `getSaleEffectiveWindow` usando el día del vencimiento:
     - `day <= 10 → '1 to 10'`, `day <= 20 → '10 to 20'`, `> 20 → '20 to 30'` (installment-dashboard.tsx:652–660 y 893–898).
   - `getActiveWindowForDate` aceptar 10–20 (`>10 && <=20`) (installment-dashboard.tsx:756–761).
   - Mantener `normalizeWindow` y etiquetas ya listas para 10–20 (installment-dashboard.tsx:779–786, 640–645).
3. Contadores: sumar 10–20 en `windowCounts` si se muestran (installment-dashboard.tsx:788–791).

## Modo compacto 1280×720
- Regla global: cuando `window.innerHeight <= 720` activar “compact-mode”.
  - Reducir `gap`, `py`, `px` en Cards/Tablas, inputs y botones.
  - Forzar `text-sm` como base y `text-base` en números clave (montos y balances) para legibilidad.
  - Asegurar `nowrap` en montos con truncado/elipsis y `title` para ver completo.
  - En tablas de cuotas: aumentar contraste en montos (`text-foreground`), balance con `font-semibold` y color semántico (installment-dashboard.tsx:1488–1496).

## Verificación
- Pruebas manuales en 1280×720: diálogos abren sin overflow y números legibles.
- Flujo de pago: registrar pago completo, ver actualización inmediata en fila y toast sin tapar botones.
- Filtros: probar “Todas”, “1–10”, “10–20”, “20–30” y ver lista coherente.

## Entregables
- Nuevo `InstallmentPaymentDialog` y hooks auxiliares.
- Ajustes en dashboard y formulario de cuotas.
- Configuración de Toaster con offset y duraciones.
- Opción y lógica para ventana 10–20 en filtros.

¿Seguimos con esta implementación? Haré los cambios y te muestro el resultado en un preview para validar en 1280×720.