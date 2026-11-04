# Compra directa y cotización de materiales

Compras mantiene `/marketplace` y agrega `/compras/cotizaciones`. Ventas agrega `/precios` y `/cotizaciones`. Ambos perfiles comparten el estado del espacio existente mediante `/api/demo` en la app original.

- Las publicaciones eligen `direct` o `quote`. Las ofertas directas vencidas no se pueden convertir en órdenes. El carrito pide revisar un precio/revisión nuevos antes de confirmar.
- Los proveedores seleccionan ofertas de su propia empresa, confirman precios iguales o aplican porcentaje/precio común. Siempre fijan vencimiento. El servidor verifica la revisión esperada y aplica el lote de forma atómica, conservando stock físico y órdenes anteriores.
- Se distinguen modificación, confirmación y vencimiento. La migración inicial agrega siete días de vigencia a las publicaciones existentes, una sola vez por espacio; las confirmaciones posteriores son explícitas.
- Solicitar cotización exige proyecto completo, cantidad y producto. No reserva stock ni ejecuta pago. Ventas responde con precio final por presentación, impuestos/condiciones, vencimiento, preparación, envío y anticipo.
- Aceptar una oferta vigente verifica su versión, destino y stock. Crea una orden aceptada con el precio acordado y reserva las cantidades a través del mecanismo existente. No ejecuta transferencias. El flete no incluido sigue pendiente de coordinación.
- Las ofertas aceptadas no pueden sobrescribirse ni cancelarse como consultas: la compra sigue en Órdenes y Fondos. Una nueva lista no modifica el precio de esa orden.
- El backend conserva el acceso por espacio compartido de esta aplicación; estas funciones no incorporan autenticación de empresas real, pagos Belo ni contratos on-chain.

Validación: `scripts/check-pricing-quotes.mjs`, órdenes compartidas, transporte, marketplace, TypeScript y compilación de producción. Los controles del API se prueban con un espacio aislado; no se alteran las órdenes del usuario para hacer QA.
