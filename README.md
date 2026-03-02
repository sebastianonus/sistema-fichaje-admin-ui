# ONUS Express - Admin v1 UI

Panel administrativo para fichaje laboral con enfoque en auditabilidad.

## Estado

Base funcional conectada a Supabase Edge Functions.

Implementado:
- Login UI para admins (sesión Supabase) cuando no hay token fijo
- Portal worker operativo con login propio
- PWA instalable (pantalla de inicio en movil)
- Dashboard con métricas reales (`/admin-dashboard`)
- Gestión de trabajadores (listar, detalle, crear, editar, desactivar, cambiar contraseña)
- Corrección auditada de fichajes sin alterar el registro original
- Incidencias de fichaje visibles en dashboard, listado y detalle
- Gestión de exports (listar, generar, descargar por signed URL, revocar)
- Ajustes operativos (health check endpoints + cambio de contraseña en modo sesión)
- Estados visuales `loading`, `error`, `empty`
- Responsive desktop/tablet/mobile

No implementado:
- Persistencia de preferencias locales avanzadas

## Scripts

- `npm run dev`
- `npm run build`
- `npm run test`

## Variables de entorno

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ENABLE_STATIC_ADMIN_TOKEN=false
VITE_ADMIN_BEARER_TOKEN=
VITE_FORCE_WORKER_MODE=false
```

Notas:
- En producción de admin, `VITE_ENABLE_STATIC_ADMIN_TOKEN=false`.
- En un despliegue dedicado solo a worker, usar `VITE_FORCE_WORKER_MODE=true`.

## Estructura principal

- `src/lib/api.ts`: cliente de integración Edge Functions
- `src/lib/supabase.ts`: cliente opcional para sesión existente
- `src/app/components/*`: vistas y modales
- `INTEGRATION.md`: contrato de endpoints vigente
- `GUIA_TRABAJADORES.md`: base de tutorial para uso del portal worker

## Nota

El backend vive en el módulo hermano `sistema-fichaje` con migraciones y funciones Edge.

## Publicacion

Checklist operativo: `GO_LIVE_TODAY.md`.
