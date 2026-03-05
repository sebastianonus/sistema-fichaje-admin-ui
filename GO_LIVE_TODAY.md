# Go Live Hoy (Checklist)

## 0. Cumplimiento legal/documental (bloqueante)
- Completar y archivar:
  - `compliance/CHECKLIST_GO_LIVE_LEGAL_OPERATIVO.md`
  - `compliance/PROTOCOLO_INTERNO_FICHAJE_ONUS.md`
  - `compliance/CLAUSULA_INFORMATIVA_RGPD_FICHAJE.md`
- Confirmar comunicacion formal del protocolo y clausula RGPD a plantilla.
- Si hay terceros con acceso a datos (hosting/soporte): contrato de encargado art. 28 RGPD firmado.

## 1. Configuracion minima de produccion
- Definir `VITE_SUPABASE_URL` de produccion.
- Definir `VITE_SUPABASE_ANON_KEY` de produccion.
- Definir `VITE_WORKER_TERMS_VERSION` de produccion (ejemplo: `v1.1-2026-03-05`).
- Mantener `VITE_ENABLE_STATIC_ADMIN_TOKEN=false` en produccion.
- No usar `VITE_ADMIN_BEARER_TOKEN` en frontend de produccion.
- Opcional: configurar `VITE_WORKER_TERMS_DOC_URL` y `VITE_WORKER_PRIVACY_DOC_URL` para mostrar enlaces directos en la aceptacion worker.

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
  - `worker-terms`
- Confirmar migraciones aplicadas (`supabase db push`).
- Probar RLS/politicas con un usuario worker y uno admin.

## 4. QA funcional (bloqueante)
- Login admin OK.
- Login worker OK.
- Clock in / clock out OK.
- Clock in / clock out solo con GPS valido OK.
- Activar / desactivar trabajador OK.
- Reactivar trabajador OK.
- Correccion auditada de fichajes OK.
- Incidencias de jornada abierta visibles en admin OK.
- Export por rango de fechas OK.
- Export por trabajador especifico OK.
- Export zona horaria `peninsula` y `canarias` OK.
- Instalacion en pantalla de inicio (iPhone/Android) OK.

## 5. Publicacion frontend
- Build local: `npm run build --silent`.
- Tests local: `npm run test --silent`.
- Subir `dist/` en hosting elegido (Vercel/Netlify/Cloudflare/Nginx).
- Configurar dominio y HTTPS.

## 6. Post go-live
- Revisar consola frontend (errores 4xx/5xx) durante primeras 24h.
- Revisar logs de Edge Functions en Supabase.
- Crear backup de base y export inicial de auditoria.
