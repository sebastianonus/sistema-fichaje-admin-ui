# Quick Start - ONUS Express Admin v1

## 1) Instalar dependencias

```bash
npm install
```

## 2) Configurar entorno

Crear `.env` (puedes partir de `.env.example`):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ADMIN_BEARER_TOKEN=<jwt-admin>
```

## 3) Levantar frontend

```bash
npm run dev
```

## 4) Backend requerido

Desde `sistema-fichaje`:

- Migraciones aplicadas (`supabase db push`)
- Functions desplegadas:
  - `admin-dashboard`
  - `admin-workers`
  - `admin-users`
  - `exports`

## 5) Smoke test manual

- Dashboard muestra métricas sin error.
- Trabajadores lista registros y permite crear/editar/desactivar.
- Export genera CSV y abre descarga por signed URL.

## Comandos útiles

```bash
npm run build
npm run test
```
