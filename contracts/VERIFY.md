# Verificar el escrow en el explorador de Fuji

Esto se hace después de firmar el despliegue con Core. No hay una dirección hasta que esa transacción exista.

1. En Chrome, con Core en Avalanche Fuji, usá el botón "Firmar despliegue con Core" en Fondos. El botón permanece apagado hasta que el USDT de prueba tenga dirección y decimales confirmados.
2. Cuando Core confirme, el backend muestra la dirección del contrato. Abrila en el explorador de la red de prueba:
   https://subnets.avax.network/c-chain/address/DIRECCION
3. Elegí verificar y publicar el código.
4. Compilador: 0.8.28. Optimizador: activado. Corridas: 200.
5. Archivos: `contracts/src/ObraClaraPartialEscrow.sol` y `contracts/src/SafeERC20.sol`.
6. Argumentos del constructor, en este orden: dirección del USDT confirmado, sus decimales, y 43113.
7. El bytecode compilado también está en `lib/fuji-escrow-artifact.json`.

No uses una dirección de Avalanche mainnet ni el USDC de Circle como si fuera USDT. `LocalSimulationERC20` no se despliega: es solo para pruebas en esta máquina.

## ARGt en Avalanche mainnet

El mismo bytecode acepta la cadena que se le pasa si coincide con `block.chainid`. Para ARGt los argumentos son `0x2E4e93eCA2E16E4989b894e188B7F7fC0175703B`, `18` y `43114`. No se despliega desde este repositorio.

Orden que tiene que hacer una persona con Core, después de aprobar la configuración real:

1. Publicar este Worker en un entorno que no sea la D1 de producción, con `OC_ESCROW_RAIL=avalanche-argt`, `FUJI_RPC_URL=https://api.avax.network/ext/bc/C/rpc` y, solo entonces, `OC_ESCROW_ENABLE=1`.
2. En Core, elegir Avalanche C-Chain (43114). La app no agrega el token ni la red sola.
3. Firmar el despliegue. El backend confirma token, decimales y cadena antes de guardar la dirección.
4. La compra de 100 bolsas ya existe como orden compartida. Firmar approve y fund por exactamente 5 ARGt.
5. Autorizar la wallet del empleado. Ventas despacha sin cobrar.
6. El empleado firma settle con 80. El recibo tiene que mostrar 4 ARGt y 1 ARGt.
7. La orden de vencimiento, si se usa, reembolsa los 5 ARGt completos.

Fuji y mainnet no comparten órdenes. No hay migración de registros. `cloudflare/migrations/0003_argt_no_rewrite.sql` no modifica filas.
