# Checklist Legal y Operativo - Go Live ONUS Fichaje

Fecha de control: 2026-03-05
Empresa: ONUS EXPRESS S.L.
CIF: B72735277
Domicilio social y operativo: Pol. Ind. Matacas, C/ Anselm Clave s/n, Nave 24, 08980 Sant Feliu de Llobregat, Barcelona
Constitucion: 11 de noviembre de 2022
Canal privacidad provisional: marketing@onusexpress.com
Campos pendientes de completar para version final firmada: ninguno en datos societarios basicos (completado).

## A. Obligaciones laborales (bloqueante)
- [ ] Se registra entrada y salida diaria por trabajador.
- [ ] El registro es objetivo, fiable y accesible.
- [ ] Existe trazabilidad de cambios/correcciones (sin borrado oculto).
- [ ] Los registros se conservan 4 anos.
- [ ] Hay procedimiento para poner registros a disposicion de Inspeccion.

## B. Proteccion de datos (bloqueante)
- [ ] Registro de actividad de tratamiento actualizado (control horario).
- [ ] Clausula informativa entregada a toda la plantilla.
- [ ] Politica interna/protocolo de uso firmada o comunicada formalmente.
- [ ] Matriz de accesos por rol (admin/worker) revisada.
- [ ] Medidas de seguridad activas (credenciales, logs, backups, cifrado en transito).
- [ ] Contratos art. 28 RGPD con terceros que traten datos (si aplica).
- [ ] Si hay biometria: EIPD y analisis de proporcionalidad documentados.

## C. Evidencias tecnicas del proyecto (ya implementado)
- Integridad append-only en eventos de jornada:
  - `sistema-fichaje/supabase/migrations/20260123223201_init_core.sql`
- Correccion auditada de fichajes:
  - `sistema-fichaje/supabase/functions/correction/index.ts`
- Exportaciones auditables y revocables:
  - `sistema-fichaje/supabase/functions/exports/index.ts`
  - `sistema-fichaje/supabase/migrations/20260202112120_exports_auditable.sql`
- Geolocalizacion en fichaje (si habilitada en operativa):
  - `sistema-fichaje/supabase/functions/clock/index.ts`
  - `sistema-fichaje/supabase/migrations/20260302161500_time_events_gps.sql`

## D. Operacion diaria
- [ ] RRHH/Administracion valida incidencias de jornada diariamente.
- [ ] Se realiza export de control (semanal o mensual) y se archiva.
- [ ] Se revisan logs de errores de funciones y accesos.
- [ ] Se revisan altas/bajas de usuarios para evitar cuentas activas innecesarias.

## E. Cierre de arranque
- [ ] Test frontend OK (`npm run test --silent`).
- [ ] Build frontend OK (`npm run build --silent`).
- [ ] Migraciones aplicadas en Supabase produccion.
- [ ] Edge Functions desplegadas y verificadas.
- [ ] Protocolo + clausula firmados/comunicados.

Resultado final:
- [ ] APTO PARA OPERAR
- [ ] NO APTO (indicar bloqueantes)

