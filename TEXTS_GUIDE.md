# Guía de Textos Centralizados - ONUS Express

## Ubicación

Todos los textos de la aplicación están centralizados en:

```
/src/constants/texts.ts
```

## Estructura

El objeto `TEXTS` está organizado por secciones funcionales:

```typescript
export const TEXTS = {
  nav: { ... },              // Navegación (sidebar)
  dashboard: { ... },        // Dashboard y métricas
  trabajadores: { ... },     // Gestión de trabajadores
  workerDetail: { ... },     // Modal de detalle de trabajador
  workerPassword: { ... },   // Modal de cambio de contraseña
  deactivateWorker: { ... }, // Modal de desactivación
  createWorker: { ... },     // Modal de crear trabajador
  confirmation: { ... },     // Modales de confirmación
  exports: { ... },          // Gestión de exports
  createExport: { ... },     // Modal de crear export
  revokeExport: { ... },     // Confirmación de revocación
  ajustes: { ... },          // Ajustes
  common: { ... },           // Textos comunes
}
```

## Uso en Componentes

### Importación

```typescript
import { TEXTS } from '@/constants/texts';
```

### Ejemplos de Uso

#### Navegación
```typescript
// sidebar.tsx
const menuItems = [
  { id: 'dashboard', label: TEXTS.nav.dashboard, icon: LayoutDashboard },
  { id: 'trabajadores', label: TEXTS.nav.trabajadores, icon: Users },
  // ...
];
```

#### Títulos y Subtítulos
```typescript
// dashboard.tsx
<h1>{TEXTS.dashboard.title}</h1>
<p className="text-[#666666] mt-1">{TEXTS.dashboard.subtitle}</p>
```

#### Botones y Acciones
```typescript
// trabajadores.tsx
<button>
  <Plus className="w-5 h-5" />
  {TEXTS.trabajadores.actions.createWorker}
</button>
```

#### Mensajes de Estado
```typescript
// dashboard.tsx
{worker.is_active 
  ? TEXTS.trabajadores.table.status.active 
  : TEXTS.trabajadores.table.status.inactive
}
```

#### Placeholders
```typescript
// trabajadores.tsx
<input
  placeholder={TEXTS.trabajadores.filters.placeholders.searchName}
  // ...
/>
```

#### Validación y Errores
```typescript
// createExport.tsx
{dateFrom > dateTo && (
  <p className="text-sm text-[#dc2626]">
    {TEXTS.createExport.validation.dateError}
  </p>
)}
```

## Secciones Detalladas

### 1. Navegación (`nav`)
```typescript
nav: {
  dashboard: 'Dashboard',
  administracion: 'Administración',
  trabajadores: 'Trabajadores',
  exports: 'Exports',
  ajustes: 'Ajustes',
}
```

### 2. Dashboard (`dashboard`)
```typescript
dashboard: {
  title: 'Dashboard',
  subtitle: 'Vista general del sistema de fichaje',
  cards: {
    activeWorkers: 'Trabajadores activos',
    clockedInWorkers: 'Trabajadores fichados ahora',
    todayEvents: 'Eventos hoy',
    moreWorkers: 'más',
  },
  actions: {
    createWorker: 'Crear trabajador',
    generateExport: 'Generar export',
  },
  errors: {
    loadError: 'Error al cargar',
    retry: 'Reintentar',
  },
}
```

### 3. Trabajadores (`trabajadores`)

Incluye:
- Títulos y subtítulos
- Filtros (labels, placeholders, opciones)
- Tabla (columnas, estados, acciones)
- Estados vacíos (diferenciados)
- Acciones

```typescript
trabajadores: {
  title: 'Trabajadores',
  subtitle: 'Gestión de altas, estados y fichajes',
  filters: { ... },
  table: { ... },
  empty: { ... },
  actions: { ... },
}
```

### 4. Detalle de Trabajador (`workerDetail`)

```typescript
workerDetail: {
  title: 'Detalle de trabajador',
  sections: {
    basicInfo: 'Información básica',
    password: 'Contraseña',
    timeEvents: 'Historial de fichajes',
    dangerZone: 'Acciones peligrosas',
  },
  fields: { ... },
  status: { ... },
  actions: { ... },
  timeEvents: { ... },
  dangerZone: { ... },
}
```

### 5. Exports (`exports`)

```typescript
exports: {
  title: 'Exports',
  subtitle: 'Gestión de registros legales y auditables',
  table: {
    columns: { ... },
    status: { ... },
    actions: { ... },
  },
  empty: { ... },
  actions: { ... },
}
```

### 6. Común (`common`)

Textos reutilizables en toda la aplicación:

```typescript
common: {
  loading: 'Cargando...',
  error: 'Error',
  noData: '—',
  required: '*',
}
```

## Beneficios

### 1. Mantenibilidad
- Todos los textos en un solo archivo
- Fácil de actualizar y revisar
- Búsqueda rápida de textos

### 2. Consistencia
- Uso uniforme de términos
- Evita duplicados o variaciones
- Facilita el control de calidad

### 3. Internacionalización (i18n)
- Preparado para traducción futura
- Estructura clara por secciones
- Fácil de reemplazar con sistema i18n completo

### 4. Type Safety
- TypeScript autocompletado
- Detección de textos faltantes en compile time
- Refactoring seguro

## Migrando a Sistema i18n

Si en el futuro necesitas múltiples idiomas:

```typescript
// Antes (actual)
import { TEXTS } from '@/constants/texts';
<h1>{TEXTS.dashboard.title}</h1>

// Después (con react-i18next por ejemplo)
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<h1>{t('dashboard.title')}</h1>
```

Solo necesitarías:
1. Instalar librería i18n (react-i18next, next-intl, etc.)
2. Convertir `texts.ts` a archivos JSON por idioma
3. Reemplazar `TEXTS.x.y` por `t('x.y')`

## Convenciones

### Nomenclatura
- **Secciones**: minúsculas, descriptivas (`dashboard`, `trabajadores`)
- **Subsecciones**: camelCase (`basicInfo`, `timeEvents`)
- **Textos**: strings directos, sin prefijos

### Organización
- Agrupa por componente/página
- Mantén jerarquía lógica (title → subtitle → fields → actions)
- Separa textos comunes en `common`

### Actualización
1. Abre `/src/constants/texts.ts`
2. Localiza la sección apropiada
3. Actualiza el texto
4. TypeScript te avisará si hay errores

## Ejemplos Completos

### Formulario con Validación
```typescript
<form>
  <label>
    {TEXTS.createWorker.fields.fullName} 
    <span className="text-[#dc2626]">{TEXTS.createWorker.required}</span>
  </label>
  <input
    placeholder={TEXTS.createWorker.fields.placeholders.fullName}
  />
  
  <button type="submit">
    {isSubmitting 
      ? TEXTS.createWorker.actions.creating 
      : TEXTS.createWorker.actions.create
    }
  </button>
  
  <button type="button">
    {TEXTS.createWorker.actions.cancel}
  </button>
</form>
```

### Estados Condicionales
```typescript
{isEmpty && !hasFilters && (
  <div>
    <h2>{TEXTS.trabajadores.empty.noWorkers.title}</h2>
    <p>{TEXTS.trabajadores.empty.noWorkers.line1}</p>
    <p>{TEXTS.trabajadores.empty.noWorkers.line2}</p>
  </div>
)}

{isEmpty && hasFilters && (
  <div>
    <h2>{TEXTS.trabajadores.empty.noResults.title}</h2>
    <p>{TEXTS.trabajadores.empty.noResults.subtitle}</p>
  </div>
)}
```

### Tablas
```typescript
<table>
  <thead>
    <tr>
      <th>{TEXTS.trabajadores.table.columns.nombre}</th>
      <th>{TEXTS.trabajadores.table.columns.email}</th>
      <th>{TEXTS.trabajadores.table.columns.activo}</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>{worker.full_name}</td>
      <td>{worker.email}</td>
      <td>
        {worker.is_active 
          ? TEXTS.trabajadores.table.status.active 
          : TEXTS.trabajadores.table.status.inactive
        }
      </td>
    </tr>
  </tbody>
</table>
```

## Añadir Nuevos Textos

1. **Identifica la sección** apropiada o crea una nueva
2. **Mantén la jerarquía** consistente
3. **Usa nombres descriptivos** en inglés para las keys
4. **Agrupa relacionados** (fields, actions, errors, etc.)

Ejemplo:
```typescript
// Añadir nueva funcionalidad de reportes
export const TEXTS = {
  // ... existing code ...
  
  reportes: {
    title: 'Reportes',
    subtitle: 'Análisis y estadísticas',
    filters: {
      dateRange: 'Rango de fechas',
      worker: 'Trabajador',
      eventType: 'Tipo de evento',
    },
    actions: {
      generate: 'Generar reporte',
      download: 'Descargar',
      share: 'Compartir',
    },
    empty: {
      title: 'No hay datos suficientes',
      subtitle: 'Selecciona filtros para generar un reporte',
    },
  },
  
  // ... rest of code ...
}
```

## Checklist de Migración Completada

- [x] Todos los textos movidos a `/src/constants/texts.ts`
- [x] Sidebar actualizado
- [x] Dashboard actualizado
- [x] Trabajadores actualizado
- [x] Worker Detail Modal actualizado
- [x] Create Worker Modal actualizado
- [x] Confirmation Modal actualizado
- [x] Exports actualizado
- [x] Create Export Modal actualizado
- [x] Ajustes actualizado
- [x] Documentación creada

## Resultado

- **0** textos hardcodeados en componentes
- **1** archivo centralizado de textos
- **100%** type-safe con TypeScript
- **Listo** para internacionalización futura

---

**Última actualización:** Febrero 2026  
**Idioma actual:** Español (es-ES)
