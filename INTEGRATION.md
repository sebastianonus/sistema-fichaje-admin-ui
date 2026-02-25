# ONUS Express - Admin v1 UI Integration Guide

## Estado actual

Admin v1 ya no es solo presentacional: esta base queda integrada con Edge Functions reales de Supabase para dashboard, workers y exports.

## Requisitos de entorno

`.env` en `sistema-fichaje-admin-ui`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
# Opcion A: token fijo para entorno operativo
VITE_ADMIN_BEARER_TOKEN=<jwt-admin>
# Opcion B: dejar vacio y usar login UI
# Opcional si usas dominio custom de funciones:
# VITE_SUPABASE_FUNCTIONS_URL=https://<project-ref>.functions.supabase.co
```

## Política de integración

- Backend Supabase es la fuente de verdad.
- Sin endpoints inventados en frontend.
- Sin persistencia local de sesión/estado fuera de React state.

## Endpoints reales

### Dashboard

- `GET /admin-dashboard`
- Response:

```ts
{
  active_workers: number
  events_today: number
  clocked_in_workers_count: number
  clocked_in_workers: Array<{
    id: string
    full_name: string
    clock_in_time: string
  }>
}
```

### Workers

- `GET /admin-workers`
  - Query params: `search`, `is_active`, `created_from`, `created_to`, `clocked_in`
- `GET /admin-workers/:id`
- `PATCH /admin-workers/:id` body: `{ full_name?: string, email?: string }`
- `PATCH /admin-workers/:id/deactivate`
- `POST /admin-workers/:id/password` body: `{ password: string }`
- `POST /admin-users` body: `{ full_name, email, password }`

### Exports

- `GET /exports?limit=200`
  - Incluye `created_by_name` en cada registro para render de tabla
- `POST /exports` body: `{ from: string, to: string, worker_id?: string }`
- `POST /exports/:id/signed-url`
- `DELETE /exports/:id`

## Contrato de errores

Todos los endpoints devuelven envelope JSON:

```ts
{ ok: true, data: ... }
{ ok: false, error: string, details?: string }
```

Frontend muestra `error/details` en estado de error y permite retry.

## Seguridad

- Edge Functions validan JWT y rol `admin` internamente.
- RLS sigue activa en tablas (`profiles`, `time_events`, `exports`).
- Hay login UI para autenticacion por sesion cuando no se usa token fijo.
