# Tasacion economica del proyecto ONUS Fichaje

## Resumen ejecutivo

ONUS Fichaje es una solucion web operativa para control de jornada con doble interfaz:

- portal de administracion
- portal de trabajador

La plataforma ya cubre funciones clave de uso real:

- autenticacion por roles
- alta y gestion de trabajadores
- fichaje de entrada y salida
- geolocalizacion obligatoria en el fichaje
- correccion auditada de fichajes sin alterar el registro original
- deteccion de incidencias de jornada abierta
- exportacion de registros
- uso movil mediante acceso web instalable en pantalla de inicio (PWA)

No estamos ante una idea o maqueta. Es un producto funcional de nivel MVP avanzado, ya orientado a operacion real.

## Alcance funcional incluido

### 1. Backend y datos

- Base de datos en Supabase con modelo estructurado
- Migraciones versionadas
- Edge Functions para logica de negocio
- Separacion entre datos de usuario, fichajes, exports e incidencias
- Restricciones de integridad y enfoque auditable

### 2. Gestion administrativa

- Login administrador
- Dashboard con metricas operativas
- Listado y detalle de trabajadores
- Edicion de datos de trabajador
- Activacion y desactivacion de accesos
- Cambio de contrasena de trabajadores
- Visualizacion de incidencias operativas

### 3. Portal de trabajador

- Login de trabajador
- Fichaje de entrada y salida
- Validacion de GPS antes del fichaje
- Visualizacion de jornada en curso
- Recordatorio previo al final de jornada
- Uso adaptado a movil
- Instalacion como acceso en pantalla de inicio

### 4. Trazabilidad y control

- Registro append-only de fichajes
- Correcciones auditadas sin borrar el evento original
- Deteccion de incidencias por jornada abierta demasiado tiempo
- Export legal y operativo de registros
- Referencias de ubicacion en fichajes validos

## Nivel de madurez actual

Estado del proyecto:

- funcional para uso interno
- con despliegue web viable
- con flujos reales de operacion ya implementados
- con documentacion base para trabajadores

Esto posiciona la plataforma como:

- MVP avanzado
- solucion interna lista para piloto o uso real controlado
- base comercializable con poco trabajo adicional

## Tasacion por coste de reposicion

El coste de reposicion estima cuanto costaria reconstruir hoy esta misma solucion desde cero con un perfil tecnico competente.

Estimacion de esfuerzo:

- analisis funcional y estructura: 10 a 20 horas
- modelado de datos y migraciones: 12 a 24 horas
- Edge Functions / backend: 25 a 50 horas
- frontend admin: 25 a 45 horas
- frontend worker y adaptacion movil: 20 a 40 horas
- QA, despliegue y ajustes: 10 a 25 horas

Rango de esfuerzo total razonable:

- 102 a 204 horas

Tarifa profesional de referencia:

- 50 EUR/h escenario conservador
- 80 EUR/h escenario profesional medio
- 100 EUR/h escenario especializado

Valor de reposicion estimado:

- escenario conservador: 5.100 EUR a 10.200 EUR
- escenario medio: 8.160 EUR a 16.320 EUR
- escenario alto: 10.200 EUR a 20.400 EUR

## Tasacion comercial recomendada

Para valorar el proyecto como producto entregable, no debe tomarse solo el coste hora. Debe incluir:

- el tiempo ya ahorrado al cliente
- la reduccion de errores operativos
- la trazabilidad de fichajes
- la capacidad de implantacion inmediata

Rango comercial razonable:

- valor prudente: 7.500 EUR
- valor de mercado recomendado: 10.000 EUR a 12.000 EUR
- valor alto con implantacion y soporte inicial: 13.000 EUR a 15.000 EUR

## Modelo alternativo de explotacion

Si en lugar de venderse como proyecto cerrado se ofrece como servicio:

### Cuota de implantacion inicial

- 1.000 EUR a 3.000 EUR

### Mantenimiento / servicio mensual

- 150 EUR a 500 EUR al mes

Este rango depende de:

- numero de trabajadores
- soporte operativo incluido
- mantenimiento correctivo
- pequenas evoluciones funcionales
- gestion de incidencias y acompanamiento

## Factores que aumentan el valor

- Arquitectura ya separada entre backend y frontend
- Trazabilidad sin alteracion del registro original
- Uso movil real
- Geolocalizacion en fichajes
- Deteccion de incidencias operativas
- Exportacion de registros
- Sistema ya adaptado a operacion real

## Factores que limitan el valor

- No es app nativa, sino PWA
- Algunas automatizaciones pueden seguir madurando
- La deteccion de incidencias puede mejorarse aun mas con tareas programadas dedicadas
- Falta ampliar documentacion para administracion y soporte
- No existe todavia una capa multicliente o configuracion avanzada por empresa

## Precio recomendado para presentacion

Si se necesita una cifra clara y defendible para presentar el proyecto, la recomendacion es:

- Precio de tasacion recomendado: 10.500 EUR

Formula comercial sugerida:

- Desarrollo y puesta en marcha: 9.800 EUR a 11.500 EUR
- Soporte mensual opcional: 180 EUR a 350 EUR / mes

## Conclusiones

ONUS Fichaje ya tiene suficiente entidad tecnica y funcional para valorarse como una solucion profesional, no como una simple prueba.

La cifra mas defendible hoy, sin sobredimensionar ni infravalorar el trabajo realizado, es:

- 10.000 EUR a 12.000 EUR como valor de mercado razonable

Si se presenta con implantacion, soporte y acompanamiento, puede defenderse un rango superior.
