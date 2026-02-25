# ONUS Express - Admin v1 UI

Panel administrativo para fichaje laboral con enfoque en auditabilidad.

## Estado

Base funcional conectada a Supabase Edge Functions.

Implementado:
- Login UI para admins (sesión Supabase) cuando no hay token fijo
- Dashboard con métricas reales (`/admin-dashboard`)
- Gestión de trabajadores (listar, detalle, crear, editar, desactivar, cambiar contraseña)
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
VITE_ADMIN_BEARER_TOKEN=<jwt-admin>
```

## Estructura principal

- `src/lib/api.ts`: cliente de integración Edge Functions
- `src/lib/supabase.ts`: cliente opcional para sesión existente
- `src/app/components/*`: vistas y modales
- `INTEGRATION.md`: contrato de endpoints vigente

## Nota

El backend vive en el módulo hermano `sistema-fichaje` con migraciones y funciones Edge.
