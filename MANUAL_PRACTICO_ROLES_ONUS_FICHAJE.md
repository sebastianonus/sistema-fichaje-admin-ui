# Manual Practico por Roles - ONUS Fichaje

Version: 1.0  
Fecha: 2026-03-09  
Sistema: ONUS Fichaje (admin + portal trabajador)

## 1. Objetivo del manual
Este documento explica, de forma practica, como se usa la app segun cada rol operativo.

## 2. Roles incluidos
- Trabajador
- Administracion / RRHH (rol admin en la app)
- Responsable IT
- Direccion

## 3. Flujo resumido del sistema
1. El trabajador accede al portal y ficha `entrada`.
2. Si hay descanso, registra `inicio pausa` y `fin pausa`.
3. Al terminar, ficha `salida`.
4. Admin revisa dashboard, trabajadores e incidencias.
5. Admin corrige solo cuando aplica, siempre con trazabilidad.
6. Admin genera exports historicos (CSV/XLSX/PDF) para control y auditoria.

## 4. Rol: Trabajador
### 4.1 Tareas diarias
1. Entrar con email y contrasena personal.
2. Fichar `entrada` al inicio real de jornada.
3. Si hay descanso, usar `Iniciar pausa` y luego `Reanudar`.
4. Fichar `salida` al fin real de jornada.

### 4.2 Reglas clave
- No fichar por terceros.
- Mantener GPS/ubicacion activo al fichar.
- No usar `salida + entrada` para simular pausa (usar boton de pausa).
- Si falta un fichaje, avisar a Administracion el mismo dia o siguiente habil.

### 4.3 Errores frecuentes y accion
- `GPS_REQUIRED`: activar ubicacion, esperar senal y repetir.
- `INVALID_SEQUENCE`: revisar el ultimo estado (ejemplo: no se puede hacer salida sin entrada).
- Usuario inactivo: contactar con Administracion.

## 5. Rol: Administracion / RRHH (admin)
### 5.1 Tareas diarias
1. Revisar `Dashboard`.
2. Revisar `Trabajadores`:
- estados activos/inactivos
- ultimo evento
- incidencias abiertas
3. Revisar `Incidencias` y gestionar las que esten en `OPEN`.

### 5.2 Altas y gestion de trabajadores
1. Crear trabajador o editar datos.
2. Preparar credenciales de onboarding.
3. Enviar acceso por WhatsApp (mensaje preconfigurado).
4. Activar/desactivar segun estado laboral.

### 5.3 Correcciones
- Se corrige desde `Incidencias` o detalle de trabajador.
- Se corrigen eventos `CLOCK_IN`, `CLOCK_OUT`, `BREAK_START`, `BREAK_END`.
- La correccion es auditada: no borra el evento original.
- Toda correccion debe llevar `nota` explicativa.

### 5.4 Exports
1. Ir a `Exports`.
2. Elegir rango de fechas, trabajador (opcional), zona horaria y formato (`CSV`, `XLSX`, `PDF`).
3. Generar y descargar.
4. Revocar export cuando ya no deba estar disponible.

## 6. Rol: Responsable IT
### 6.1 Operacion tecnica
- Verificar despliegue y salud de Edge Functions.
- Supervisar errores de auth, clock, correccion y exports.
- Gestionar backups y control de accesos.
- Mantener variables de entorno y claves fuera de cliente.

### 6.2 Controles minimos
- Verificar que RLS/politicas siguen activas.
- Verificar que la tabla de eventos mantiene modelo append-only.
- Verificar que las funciones en produccion coinciden con `main`.

## 7. Rol: Direccion
### 7.1 Responsabilidad de negocio
- Validar que el sistema se usa de forma obligatoria y uniforme.
- Exigir cierre diario de incidencias operativas.
- Garantizar que se generan y archivan exports de control periodico.
- Aprobar y mantener vigente protocolo interno y clausula informativa.

## 8. Reglas operativas transversales
- Jornada de referencia en el sistema: `7h 30m` (450 min).
- El portal muestra aviso preventivo de salida cerca del limite diario.
- Si una jornada queda abierta en exceso, se genera incidencia `LONG_OPEN_SHIFT`.
- Registros y correcciones son trazables para auditoria.

## 9. Checklist corto de uso correcto
- Trabajador: entrada/pausa/salida registradas en tiempo real.
- Admin: incidencias abiertas revisadas cada dia.
- Admin: correcciones con nota y criterio uniforme.
- Admin: export semanal o mensual archivado.
- IT: despliegue y salud tecnica sin errores bloqueantes.

## 10. Referencias internas
- `GUIA_TRABAJADORES.md`
- `compliance/PROTOCOLO_INTERNO_FICHAJE_ONUS.md`
- `compliance/CHECKLIST_GO_LIVE_LEGAL_OPERATIVO.md`
