# Obra Clara

Plataforma para compras de construcción, gestión de proyectos y seguimiento de pagos protegidos contra entrega.

## Aplicaciones publicadas

- Compras: https://obra-clara-comprador.vercel.app
- Ventas: https://obra-clara-proveedor.vercel.app
- Servicio compartido: https://obra-clara-gray.vercel.app/api/demo

## Desarrollo

Requiere Node.js 24 y pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

Copiar `.env.example` a `.env.local` y completar únicamente las variables necesarias para el entorno. Nunca versionar tokens ni archivos `.env.local`.

## Configuración de las aplicaciones

El mismo código se publica en tres proyectos Vercel. El comprador utiliza `NEXT_PUBLIC_OC_ROLE=buyer`; el proveedor utiliza `NEXT_PUBLIC_OC_ROLE=provider`. Ambos apuntan `NEXT_PUBLIC_OC_SHARED_API` al servicio compartido.

El proyecto que sirve `/api/demo` utiliza Vercel Blob privado con `BLOB_READ_WRITE_TOKEN`, configurado exclusivamente como variable de servidor. Los registros se aíslan por workspace y se actualizan con control de concurrencia e idempotencia.

## Funcionalidades

- Marketplace de materiales y equipamiento, proveedores, filtros, favoritos y carrito mixto por proyecto.
- Proyectos con datos de recepción, logística, presupuestos, gráficos y gastos por fecha y proveedor.
- Órdenes, entregas parciales, documentación con QR, inventario y movimientos.
- Fondos, reservas, anticipos, aprobaciones, conciliación e historial.
- Interfaz de ventas con productos, stock, órdenes y comprobantes.
- Brick con historial de conversaciones, archivo y adjuntos.

Los movimientos actuales de fondos son registros internos del prototipo. Este repositorio no ejecuta transferencias bancarias, operaciones Belo ni contratos en una blockchain. La conexión productiva requiere implementar autenticación, autorizaciones y las integraciones correspondientes.

## Verificación

Los scripts `scripts/check-*.mjs` verifican los modelos de compras, proyectos, fondos, inventario y otros flujos. Los registros de investigación y verificación están en `research/`.

No se incluyen credenciales, datos privados almacenados en Blob, cachés de construcción ni dependencias instaladas.

## Despliegue automático

Los proyectos Vercel `obra-clara-comprador`, `obra-clara-proveedor` y `obra-clara` están conectados a `bryantmedia-ai/obra-clara`. Cada cambio incorporado a la rama `main` debe iniciar un despliegue de producción en los tres proyectos. Las otras ramas generan previews.

Los dominios de producción se mantienen:

- https://obra-clara-comprador.vercel.app
- https://obra-clara-proveedor.vercel.app
- https://obra-clara-gray.vercel.app

Las variables de rol y el almacenamiento privado se administran en cada proyecto de Vercel; no se copian secretos al repositorio.

## Alcance del MVP: materiales y pago contra entrega

Se retiró el marketplace de fletes: las rutas `/transporte` y `/transportes` redirigen al marketplace de materiales o a las órdenes de Ventas. No se pueden contratar viajes, cotizar fletes en Proyectos ni enviar nuevos servicios de transporte al backend.

La compra conserva proveedores, cantidades, proyectos y condiciones de envío incluido/no incluido. La coordinación de entrega o retiro se acuerda con el proveedor, por fuera de la contratación de servicios en OC. El carrito ignora servicios de flete antiguos sin perder sus líneas de materiales y envía `deliveryChoice: arranged`. La compra directa y la aceptación de una cotización ya no quedan pendientes de contratar un flete.

Se mantienen las entregas de materiales dentro de Compras y los despachos en Ventas: recepción, cantidades conformadas, remitos, incidencias y habilitación de pagos contra entrega. Los registros históricos de viajes no se borran de los espacios compartidos.

Validación específica: `node scripts/check-material-only-checkout.mjs`, además de las verificaciones de órdenes, cotizaciones, recepción e integración de Cloudflare.

## Entrega simplificada en el checkout

El catálogo de ejemplo tiene 170 productos con envío incluido y 42 sin incluir (80% / 20%). Una inicialización versionada aplica esa distribución a las ofertas existentes sin cambiar precios, stock ni órdenes históricas; las ediciones posteriores del proveedor se conservan.

Por cada proyecto del carrito se puede ajustar dirección, persona que recibe, teléfono, fecha y franja preferidas e indicaciones. Se guardan como snapshot `order.delivery`, compartido con Ventas, sin modificar el proyecto. El proveedor decide vehículo y logística. Los productos sin envío incluido mantienen ese costo fuera del total hasta acordarlo por separado.

Una fecha preferida no modifica por sí sola el vencimiento financiero del contrato: la programación confirmada sigue gestionándose en las entregas de materiales.

## Avalanche Fuji: compra de cemento

Construido en este tramo, separado del marketplace y del registro ARGt que ya existían. El ARGt sigue siendo administrativo. No es el pago de esta compra y no cumple un track de stablecoin.

La única compra habilitada es 100 bolsas de Cemento Portland Loma Negra de Corralón Norte. El carrito crea una orden compartida entre Compras y Ventas. El objetivo es bloquear 5 USDT de prueba, despachar sin cobrar, y que el empleado autorizado firme 80 recibidas. Una sola liquidación paga 4 al vendedor y devuelve 1 al comprador. No queda un saldo de 20 pendiente. Si el plazo vence sin recepción, el reembolso es total.

Why Avalanche: Fuji C-Chain (43113) da finalidad rápida para cerrar la carrera entre liquidación y vencimiento en el mismo contrato, con el recibo verificable en el explorer. El activo aceptado queda fijo al desplegar el escrow. El cliente no elige otro token.

El contrato `contracts/src/ObraClaraPartialEscrow.sol` usa SafeERC20, lee los decimales del token y rechaza un activo distinto. Las pruebas `forge test` usan `LocalSimulationERC20` (SIM-LOCAL). Eso es una simulación local, no USDT oficial y no una transacción de Fuji.

USDT en Fuji no tiene dirección confirmada por Tether. Las direcciones públicas de USDT y USDT.e son de mainnet (43114) y el código las rechaza. USDC de Circle en Fuji queda disponible solo si se configura de forma explícita; no es el reemplazo automático. Sin esa configuración el backend no confirma reservas y la interfaz no envía transacciones.

No hay dirección de escrow ni enlace de explorer: nadie firmó el despliegue. Core tiene que firmarlo cuando exista el token. El bytecode sale de `forge build`. La migración D1 es aditiva: `cloudflare/migrations/0002_fuji_escrow.sql`. No está aplicada en producción.

Guion de demo, de menos de tres minutos: agregar 100 bolsas, registrar la orden, mostrar la misma orden en Ventas, explicar que el bloqueo espera el USDT de prueba, y mostrar en local el recibo de 80/100. Hasta que el recibo exista, 5, 4 y 1 son el guion, no un saldo.
