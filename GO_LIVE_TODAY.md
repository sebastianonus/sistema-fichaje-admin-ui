# Go Live Hoy (Checklist)

## 1. Configuracion minima de produccion
- Definir `VITE_SUPABASE_URL` de produccion.
- Definir `VITE_SUPABASE_ANON_KEY` de produccion.
- Mantener `VITE_ENABLE_STATIC_ADMIN_TOKEN=false` en produccion.
- No usar `VITE_ADMIN_BEARER_TOKEN` en frontend de produccion.

## 2. Seguridad y credenciales
- Rotar password del admin creado durante desarrollo.
- Rotar cualquier token temporal usado en pruebas.
- Verificar que no hay secretos en el repo:
  - `.env` no versionado.
  - solo `.env.example` en git.

## 3. Supabase (backend)
- Confirmar funciones desplegadas en el proyecto final:
  - `admin-dashboard`
  - `admin-workers`
  - `admin-users`
  - `exports`
  - `clock`
- Confirmar migraciones aplicadas (`supabase db push`).
- Probar RLS/politicas con un usuario worker y uno admin.

## 4. QA funcional (bloqueante)
- Login admin OK.
- Login worker OK.
- Clock in / clock out OK.
- Activar / desactivar trabajador OK.
- Reactivar trabajador OK.
- Export por rango de fechas OK.
- Export por trabajador especifico OK.
- Export zona horaria `peninsula` y `canarias` OK.

## 5. Publicacion frontend
- Build local: `npm run build --silent`.
- Tests local: `npm run test --silent`.
- Subir `dist/` en hosting elegido (Vercel/Netlify/Cloudflare/Nginx).
- Configurar dominio y HTTPS.

## 6. Post go-live
- Revisar consola frontend (errores 4xx/5xx) durante primeras 24h.
- Revisar logs de Edge Functions en Supabase.
- Crear backup de base y export inicial de auditoria.
