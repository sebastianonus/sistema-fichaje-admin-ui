/**
 * ONUS Express - Textos Centralizados
 */

export const TEXTS = {
  nav: {
    dashboard: 'Dashboard',
    administracion: 'Administracion',
    trabajadores: 'Trabajadores',
    exports: 'Exports',
    ajustes: 'Ajustes',
  },

  login: {
    title: 'Acceso administrador',
    subtitle: 'Inicia sesion para gestionar ONUS Fichaje',
    fields: {
      email: 'Email',
      password: 'Contrasena',
    },
    actions: {
      login: 'Entrar',
      loggingIn: 'Entrando...',
      logout: 'Cerrar sesion',
    },
  },

  dashboard: {
    title: 'Dashboard',
    subtitle: 'Vista general del sistema de fichaje',
    cards: {
      activeWorkers: 'Trabajadores activos',
      clockedInWorkers: 'Trabajadores fichados ahora',
      todayEvents: 'Eventos hoy',
      moreWorkers: 'mas',
    },
    actions: {
      createWorker: 'Crear trabajador',
      generateExport: 'Generar export',
    },
    errors: {
      loadError: 'Error al cargar',
      retry: 'Reintentar',
    },
  },

  trabajadores: {
    title: 'Trabajadores',
    subtitle: 'Gestion de altas, estados y fichajes',
    filters: {
      title: 'Filtros',
      clear: 'Limpiar filtros',
      estado: 'Estado',
      nombre: 'Nombre',
      email: 'Email',
      createdFrom: 'Creado desde',
      createdTo: 'Creado hasta',
      clockedIn: 'Tiene fichaje abierto ahora',
      placeholders: {
        searchName: 'Buscar por nombre',
        searchEmail: 'Buscar por email',
      },
      options: {
        all: 'Todos',
        active: 'Activos',
        inactive: 'Inactivos',
      },
    },
    table: {
      columns: {
        nombre: 'Nombre',
        email: 'Email',
        activo: 'Activo',
        creado: 'Creado',
        ultimoEvento: 'Ultimo evento',
        acciones: 'Acciones',
      },
      actions: {
        view: 'Ver',
      },
      status: {
        active: 'Activo',
        inactive: 'Inactivo',
      },
      noEvent: '-',
    },
    empty: {
      noWorkers: {
        title: 'No hay trabajadores',
        line1: 'Aun no has creado ningun trabajador.',
        line2: 'Desde aqui podras gestionar altas, estados y fichajes.',
      },
      noResults: {
        title: 'Sin datos',
        subtitle: 'No hay resultados con los filtros actuales.',
      },
    },
    actions: {
      filters: 'Filtros',
      createWorker: 'Crear trabajador',
      clearFilters: 'Limpiar filtros',
    },
  },

  workerDetail: {
    title: 'Detalle de trabajador',
    sections: {
      basicInfo: 'Informacion basica',
      password: 'Contrasena',
      timeEvents: 'Historial de fichajes',
      dangerZone: 'Acciones peligrosas',
    },
    fields: {
      nombre: 'Nombre',
      email: 'Email',
      estado: 'Estado',
      uuid: 'UUID',
    },
    status: {
      active: 'Activo',
      inactive: 'Inactivo',
    },
    actions: {
      edit: 'Editar',
      save: 'Guardar cambios',
      cancel: 'Cancelar',
      changePassword: 'Cambiar contrasena',
      deactivate: 'Desactivar trabajador',
      activate: 'Reactivar trabajador',
    },
    timeEvents: {
      noEvents: 'No hay eventos registrados',
    },
    dangerZone: {
      warning: 'Estas acciones son irreversibles y quedan registradas en el sistema.',
    },
  },

  workerPassword: {
    title: 'Cambiar contrasena',
    fields: {
      newPassword: 'Nueva contrasena',
      placeholder: 'Introduce la nueva contrasena',
    },
    warning: 'Comunica esta contrasena al trabajador.',
    actions: {
      change: 'Cambiar contrasena',
      cancel: 'Cancelar',
    },
  },

  deactivateWorker: {
    title: 'Desactivar trabajador',
    messages: {
      line1: 'Esta accion desactivara el acceso operativo del trabajador.',
      line2: 'La accion quedara registrada en el sistema de auditoria.',
      line3: 'Para confirmar, escribe',
      confirmWord: 'DESACTIVAR',
      line3b: 'en el campo de abajo:',
    },
    placeholder: 'Escribe DESACTIVAR',
    actions: {
      deactivate: 'Desactivar',
      cancel: 'Cancelar',
    },
  },

  activateWorker: {
    title: 'Reactivar trabajador',
    message: 'Esta accion habilitara de nuevo el acceso operativo del trabajador.',
    confirm: 'Reactivar',
  },

  createWorker: {
    title: 'Crear trabajador',
    fields: {
      fullName: 'Nombre completo',
      email: 'Email',
      password: 'Contrasena inicial',
      placeholders: {
        fullName: 'Introduce el nombre completo',
        email: 'correo@ejemplo.com',
        password: 'Introduce la contrasena',
      },
    },
    warning: 'Comunica esta contrasena al trabajador.',
    actions: {
      create: 'Crear trabajador',
      creating: 'Creando...',
      cancel: 'Cancelar',
    },
    required: '*',
  },

  confirmation: {
    save: {
      title: 'Confirmar cambios',
      message: 'Estas seguro de que quieres guardar estos cambios?',
      confirm: 'Guardar',
    },
    cancel: 'Cancelar',
  },

  exports: {
    title: 'Exports',
    subtitle: 'Gestion de registros legales y auditables',
    table: {
      columns: {
        archivo: 'Archivo',
        periodo: 'Periodo',
        creado: 'Creado',
        creadoPor: 'Creado por',
        hash: 'Hash',
        estado: 'Estado',
        acciones: 'Acciones',
      },
      status: {
        active: 'Activo',
        revoked: 'Revocado',
      },
      actions: {
        download: 'Descargar',
        revoke: 'Revocar',
        noActions: '-',
      },
    },
    empty: {
      title: 'No hay exports',
      line1: 'Los exports permiten obtener registros legales y auditables de los fichajes.',
      line2: 'Cada export incluye hash SHA-256 y firma temporal.',
    },
    actions: {
      generate: 'Generar export',
    },
  },

  createExport: {
    title: 'Generar export',
    info: {
      title: 'Export legal y auditable',
      description: 'Este archivo incluira hash SHA-256 y firma temporal. Formato CSV con encoding UTF-8 + BOM.',
    },
    fields: {
      dateFrom: 'Fecha desde',
      dateTo: 'Fecha hasta',
    },
    validation: {
      dateError: 'La fecha hasta debe ser posterior a la fecha desde',
    },
    actions: {
      generate: 'Generar export',
      generating: 'Generando...',
      cancel: 'Cancelar',
    },
    required: '*',
  },

  revokeExport: {
    title: 'Revocar export',
    message: 'Esta accion revocara el acceso al export y quedara registrada en el sistema de auditoria. El archivo no podra descargarse nuevamente.',
    confirm: 'Revocar',
  },

  ajustes: {
    title: 'Ajustes',
    subtitle: 'Configuracion del sistema',
    connection: {
      title: 'Conexion',
      urlLabel: 'Supabase URL',
      modeLabel: 'Modo autenticacion',
      modeToken: 'Token fijo (.env)',
      modeSession: 'Sesion usuario (login UI)',
    },
    health: {
      title: 'Estado de endpoints',
      checkAction: 'Comprobar ahora',
    },
    password: {
      title: 'Seguridad de sesion',
      userLabel: 'Usuario actual',
      placeholder: 'Nueva contrasena',
      action: 'Actualizar contrasena',
      success: 'Contrasena actualizada correctamente',
    },
  },

  common: {
    loading: 'Cargando...',
    error: 'Error',
    noData: '-',
    required: '*',
  },
} as const;
