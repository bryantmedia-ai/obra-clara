# Obra Clara — decisiones para continuar el MVP

Síntesis de requisitos de producto revisados el 4 de noviembre de 2026. No contiene transcripciones, identidades, datos personales ni mensajes privados del equipo.

## Diferencial y audiencia

Protección de anticipos y pagos contra cumplimiento para constructoras con edificios de más de diez pisos. El marketplace, el directorio y la logística son canales de apoyo al acuerdo comercial y a la recepción verificable.

## Integrado en el SaaS

- Compra directa con precio y vencimiento, y solicitud de cotización por producto/proyecto.
- Gestión de precios desde Ventas: selección de productos, confirmación sin cambios, ajuste porcentual o precio común y vigencia. Actualización atómica y detección de otra sesión.
- Oferta del proveedor con precio, plazo de preparación, condiciones, transporte y anticipo. Aceptación del comprador genera una orden con precio acordado; las listas posteriores no modifican esa orden.
- Directorio de fabricantes, corralones, importadores y distribuidores con rubros, geografía, modalidad comercial, fuentes, búsqueda, comparación y guardados. Separado de las tiendas que operan dentro de OC.
- QR/link del documento de orden para abrir recepción por producto. El registro operativo de recepción y Fondos ya existen; la integración on-chain no está implementada.

## Siguiente flujo de fabricación a construir

Cotización → aceptación de ambas partes → fijar precio y fecha/ventana de entrega → reservar anticipo bajo condiciones expresas → producción y seguimiento → verificar hito parcial o incumplimiento → producto terminado → reserva del saldo → recepción conformada → liberar el tramo correspondiente o tramitar devolución del saldo no ganado.

El acuerdo debe contener: cantidades y especificaciones, proyecto/destino, precio final, fecha comprometida, anticipo, hitos medibles, evidencia, responsable que valida, tolerancias, entregas parciales y reglas de devolución. Un mensaje del proveedor o un estado “terminado” no bastan para liberar dinero.

## Recepción y permisos pendientes

Perfil empleado/encargado de obra con permisos limitados a proyectos asignados. Acceso desde link o QR impreso al formulario de la orden; cantidades recibidas, faltantes/daños y firma electrónica asociada al registro. Historial de firmante, fecha y evidencia. No confundir ese registro con una firma digital certificada.

La liberación automática debe configurarse en el acuerdo y ejecutarse solo al verificar identidad, permiso, cantidades, disputas y saldo disponible. Hasta integrar billetera y contrato real, el MVP debe distinguir aprobación operativa de transferencia efectivamente ejecutada.

## Seguimiento y atención

CRM de fabricantes: producción, demoras, avisos y conversación por orden; hitos, documentos y condiciones del anticipo a la vista de ambas partes. Reputación y reseñas vinculadas a operaciones verificables. El transporte acompaña la compra cuando sea necesario, sin desplazar el recorrido principal de protección de fondos.

## Modelo de ingresos por validar

Alternativas discutidas: suscripción SaaS del vendedor, comisión de operación y planes de comprador con límites de proyectos/funciones. Las referencias de precios y cupos son hipótesis comerciales, no tarifas aprobadas. No activar cargos ni bloquear proyectos existentes hasta definir el modelo.

## Validación comercial

Usar el padrón investigado para entrevistas con fabricantes y corralones: aceptación de escrow, anticipo financiador, vigencia de cotización y compromisos de stock/producción. Preparar outreach y demos; contactar empresas o enviar mensajes requiere una instrucción explícita. No convertir una conversación de planificación en autorización de envío.
