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

- Marketplace de materiales, equipamiento y transportes, proveedores, filtros, favoritos y carrito mixto por proyecto.
- Proyectos con datos de recepción, logística, presupuestos, gráficos y gastos por fecha y proveedor.
- Órdenes, entregas parciales, documentación con QR, inventario y movimientos.
- Fondos, reservas, anticipos, aprobaciones, conciliación e historial.
- Interfaz de ventas con productos, stock, órdenes y comprobantes.
- Brick con historial de conversaciones, archivo y adjuntos.

Los movimientos actuales de fondos son registros internos del prototipo. Este repositorio no ejecuta transferencias bancarias, operaciones Belo ni contratos en una blockchain. La conexión productiva requiere implementar autenticación, autorizaciones y las integraciones correspondientes.

## Verificación

Los scripts `scripts/check-*.mjs` verifican los modelos de compras, proyectos, fondos, inventario y otros flujos. Los registros de investigación y verificación están en `research/`.

No se incluyen credenciales, datos privados almacenados en Blob, cachés de construcción ni dependencias instaladas.
