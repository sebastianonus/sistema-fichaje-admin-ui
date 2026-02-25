# Architecture Overview – ONUS Express · Admin v1

## Component Hierarchy

App.tsx (root)
├── Sidebar
│   ├── Logo (ONUS)
│   ├── Navigation Items
│   │   ├── Dashboard
│   │   ├── Administración
│   │   │   └── Trabajadores
│   │   ├── Exports
│   │   └── Ajustes
│   └── Mobile Toggle (visual only)
│
└── Main Content (conditional rendering)
    ├── Dashboard (page: dashboard)
    │   ├── Header + Quick Actions
    │   ├── MetricCard (Trabajadores activos)
    │   ├── MetricCard (Trabajadores fichados ahora)
    │   └── MetricCard (Eventos hoy)
    │
    ├── Trabajadores (page: trabajadores)
    │   ├── Header + Actions
    │   ├── Filters Panel
    │   ├── Empty State A (no workers)
    │   ├── Empty State B (no results with filters)
    │   ├── Workers Table
    │   ├── WorkerDetailModal
    │   │   ├── Basic Info (read / edit)
    │   │   ├── Password Change
    │   │   ├── Time Events History
    │   │   └── Dangerous Actions
    │   │       └── Deactivate Worker
    │   └── CreateWorkerModal
    │       └── Form (name, email, password)
    │
    ├── Exports (page: exports)
    │   ├── Header + Actions
    │   ├── Empty State (no exports)
    │   ├── Exports Table
    │   ├── CreateExportModal
    │   │   └── Form (date_from, date_to)
    │   └── ConfirmationModal (revoke)
    │
    └── Ajustes (page: ajustes)
        └── Placeholder (Próximamente)

---

## Data Flow

App.tsx
- Controls current page state
- Passes navigation to Sidebar

Trabajadores.tsx
- Local UI filter state
- Local modal state
- Workers data from backend

WorkerDetailModal.tsx
- Local edit mode state
- Local form state
- Worker data by id

Exports.tsx
- Local modal state
- Exports data from backend

Dashboard.tsx
- Metrics data from backend

---

## Backend Integration Points

FRONTEND

Dashboard.tsx
- ENDPOINT TBD (dashboard metrics)

Trabajadores.tsx
- ENDPOINT TBD (listado de trabajadores con filtros)

CreateWorkerModal
- ENDPOINT TBD (creación de trabajador vía admin)

WorkerDetailModal
- ENDPOINT TBD (detalle de trabajador)
  - Edit name/email → ENDPOINT TBD
  - Change password → ENDPOINT TBD
  - Deactivate worker → ENDPOINT TBD

Exports.tsx
- GET /exports
- POST /exports
- POST /exports/:id/signed-url (direct download)
- DELETE /exports/:id

---

## UI State Machines

Dashboard

INITIAL
→ LOADING
→ SUCCESS (metrics)
→ ERROR (Error al cargar · Reintentar)

---

Trabajadores Page

INITIAL
→ LOADING
→ NO_WORKERS (sin filtros)
→ NO_RESULTS (con filtros)
→ HAS_WORKERS (tabla)
→ ERROR

---

Worker Detail Modal

OPEN
→ READ_MODE
  → Edit
    → EDIT_MODE
      → Save → ConfirmationModal → ENDPOINT TBD
      → Cancel → READ_MODE
  → Change password → ConfirmationModal → ENDPOINT TBD
  → Deactivate → ConfirmationModal → ENDPOINT TBD
    → Requires typing "DESACTIVAR"
→ CLOSE

---

Exports Page

INITIAL
→ LOADING
→ NO_EXPORTS
  → Empty State (No hay exports)
→ HAS_EXPORTS
  → Display table
  → Download → POST /exports/:id/signed-url
  → Revoke → DELETE /exports/:id
  → Create → POST /exports
→ ERROR (retry)

---

## Responsive Rules

Mobile (<768px)
- Sidebar overlay
- Tables horizontal scroll
- Modals fullscreen

Tablet (768–1023px)
- Sidebar collapsible
- Tables scroll
- Modals centered

Desktop (≥1024px)
- Sidebar fixed
- Tables full width
- Modals centered

---

## CSS Architecture

src/styles/
- fonts.css (REM)
- theme.css (brand variables)
- tailwind.css (Tailwind only)
- index.css (global)

---

## Security & Responsibility Split

Frontend
- No auth logic
- No validation
- No business rules
- Presentational UI only

Backend (Supabase)
- Authentication
- Authorization (RLS)
- Validation & sequencing
- Audit logging
- Export integrity

---

Purpose:
This document defines the final Admin v1 architecture and serves as a handoff contract for frontend implementation against an existing Supabase backend.
