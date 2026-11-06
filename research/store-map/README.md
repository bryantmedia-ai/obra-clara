# Tiendas y mapa de Obra Clara

La demo presenta 1.173 tiendas con domicilio comercial concreto; la fuente de investigación conserva las 1.197 fichas originales. Se completaron o corrigieron 95 direcciones y se retiraron de la demo 24 fichas sin domicilio verificable o canales online duplicados. El detalle y las fuentes están en `research/provider-address-audit/report.json`. Los 125 corralones quedan incluidos en el mismo listado y filtro; se conservan las referencias comerciales existentes. Las tiendas sin catálogo previo reciben seis referencias del catálogo de construcción para su presentación en la demo. Esto no acredita alta real, stock ni relación comercial con esas empresas.

Corralón Norte y Corralón Centro mantienen accesos al flujo integrado de compra existente. Los perfiles restantes muestran sus catálogos; las referencias con catálogo comercial previo mantienen la preparación de cotización existente.

Todas las referencias visibles tienen imagen. `storeCatalog` conserva imágenes originales y completa faltantes con fotos locales del producto o su familia. `imageFallback` reemplaza URLs rotas con fotos locales; no atribuye esas fotos al proveedor original.

Los conteos usan una categoría principal por empresa para evitar duplicaciones. Son animados al ingresar y respetan la preferencia de movimiento reducido. Los botones aplican filtros persistentes en la URL.

El mapa usa Leaflet 1.9.4 alojado en el repositorio y mapas de OpenStreetMap con atribución. Las coordenadas se guardan en `components/store-locations.json`, incluyendo fuente y precisión (`address`, `street`, `locality`). La lista muestra únicamente tiendas con dirección comercial concreta; la precisión de cada pin se informa aparte. Las ubicaciones por localidad se agrupan y no simulan una dirección exacta.

Fuentes de geografía: API Georef de Argentina y consultas únicas de las direcciones públicas de corralones y domicilios corregidos mediante Nominatim, con caché local y máximo una consulta por segundo, conforme a https://operations.osmfoundation.org/policies/nominatim/. No se consulta Nominatim desde la aplicación ni se ofrece búsqueda geográfica genérica. Los resultados públicos de la consulta se guardan en `address-cache.json` para evitar repetirla.

Validación: `node scripts/check-store-network.mjs` comprueba los 125 corralones, catálogos no vacíos, imágenes y respaldos locales existentes, categorías sin doble conteo, filtros y round-trip de URL, y coordenadas. También se probaron en navegador filtro de corralones, mapa, pin → perfil → productos, panel de filtros móvil y ancho a 390 px.
