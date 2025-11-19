# Campo "Fecha de venta (opcional)"

Este campo permite ingresar manualmente la fecha de la venta.

Cómo usarlo:
- Formato aceptado: `dd/mm` o `dd/mm/aaaa`.
- Si ingresas solo `dd/mm`, se completa con el año actual.
- Si lo dejas vacío, se usa automáticamente la fecha actual del sistema.

Validación:
- Se valida el formato con la expresión regular `^\d{1,2}\/\d{1,2}(\/\d{4})?$`.
- Se verifica que la fecha exista (día/mes/año correctos).
- Si la fecha es inválida, se muestra un error y se bloquea la creación.

Almacenamiento y zona horaria:
- La fecha se convierte a ISO-8601 (`YYYY-MM-DDTHH:MM:SSZ`) usando mediodía local para evitar cambios de día por zona horaria.
- En la tabla de ventas y filtros se usa este valor para ordenar y mostrar.

Impacto en reportes y exportaciones:
- La fecha personalizada se refleja en la tabla de ventas, el detalle de la venta y las exportaciones a Excel/PDF.
- Los filtros por fecha siguen funcionando con este valor.

Compatibilidad con importación desde Excel:
- Los formatos ISO-8601 o fechas compatibles con `Date` de JavaScript se interpretan correctamente.
- Si importas fechas como `dd/mm/aaaa`, se recomienda convertirlas previamente a ISO para mejor compatibilidad.

Notas:
- Editar una venta permite actualizar la fecha (cuando aplique).
- No afecta el campo `created_at`, que sigue indicando la fecha de creación en el sistema.