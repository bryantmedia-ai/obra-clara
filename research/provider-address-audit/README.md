# Depuración de domicilios de proveedores — 6 de noviembre de 2026

Se revisaron las fichas sin domicilio o con textos genéricos (país/cobertura, localidad, calle sin altura, parque industrial sin calle/lote). Las direcciones recuperadas llevan fuente pública y fecha en `components/provider-address-overrides.json`. El informe `report.json` enumera las 95 correcciones y las 24 fichas retiradas; quedan 1.173 tiendas visibles, incluidos los 125 corralones.

La dirección concreta aparece primero junto al pin y la localidad/provincia debajo. La misma regla alimenta listado, búsqueda, categorías, conteos y mapa. Los registros originales se conservan como investigación, sin reaparecer en la demo ni afectar órdenes guardadas. Los canales online sin domicilio se retiran cuando ya existe una sucursal de la misma empresa con dirección.

OFG, Chapaferro, Zinguería La Artesanal y DACAVI también recuperan familias de productos desde sus sitios oficiales. Las fotos de respaldo son imágenes locales por familia de producto; no se atribuyen al proveedor como fotografías propias ni confirman stock.

Las coordenadas de los domicilios corregidos se actualizan una vez y se guardan con fuente y precisión. Un domicilio verificado no implica que el geocodificador haya identificado el edificio: el mapa distingue ubicación por dirección, calle o localidad. La aplicación no ejecuta búsquedas masivas de geocodificación.

Validación: `node scripts/audit-provider-addresses.mjs`, `node scripts/check-store-network.mjs`, compilación de producción y revisión en navegador de ficha recuperada, ficha retirada y pantalla móvil.
