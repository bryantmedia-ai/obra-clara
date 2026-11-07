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
