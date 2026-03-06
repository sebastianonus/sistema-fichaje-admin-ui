/**
 * ONUS Express - Textos Centralizados
 */

export const TEXTS = {
  nav: {
    dashboard: 'Dashboard',
    administracion: 'Administracion',
    trabajadores: 'Trabajadores',
    incidencias: 'Incidencias',
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
    placeholders: {
      adminEmail: 'admin@empresa.com',
      workerEmail: 'trabajador@empresa.com',
      passwordMask: '********',
    },
    aria: {
      showPassword: 'Mostrar contrasena',
      hidePassword: 'Ocultar contrasena',
    },
    errors: {
      authError: 'Error de autenticacion',
      workerLoginError: 'No se pudo iniciar sesion',
    },
  },

  workerPortal: {
    fallbackWorkerName: 'Trabajador',
    loading: 'Cargando...',
    title: 'Portal trabajador',
    loginTitle: 'Acceso mensajero',
    loginSubtitle: 'Inicia sesion para fichar entrada y salida',
    sections: {
      clockStatus: 'Estado de fichaje',
      latestEvents: 'Ultimos eventos',
      timelineTitle: 'Linea de fichaje de hoy',
    },
    status: {
      openClock: 'Tienes fichaje abierto (entrada registrada).',
      noOpenClock: 'No tienes fichaje abierto.',
      inactiveUser: 'Tu usuario esta inactivo. Contacta con administracion.',
      workedToday: 'Horas trabajadas hoy (tramos cerrados):',
      noEvents: 'Sin eventos registrados.',
      noClosedSegments: 'Sin tramos cerrados',
      journeyLabel: 'Jornada',
      totalLabel: 'Total:',
      segmentTotal: 'Total tramo:',
      passwordChangePending: 'Tienes cambio de contrasena pendiente. Puedes fichar hasta el dia limite.',
      passwordChangeBlocking: 'Desde hoy debes cambiar tu contrasena para volver a fichar.',
      iosInstallHint: 'Para instalar en iPhone: pulsa Compartir y luego "Anadir a pantalla de inicio".',
      gpsMissingWarning: 'No se pudo obtener la ubicacion en este fichaje. Revisa permisos, GPS y cobertura.',
    },
    actions: {
      clockIn: 'Fichar entrada',
      clockOut: 'Fichar salida',
      closeSession: 'Cerrar sesion',
      updatePassword: 'Actualizar contrasena',
      updatingPassword: 'Actualizando...',
    },
    passwordModal: {
      title: 'Cambio obligatorio de contrasena',
      messageNoDeadline: 'Debes actualizar tu contrasena para continuar.',
      messageWithDeadlinePrefix: 'Debes actualizar tu contrasena antes de',
      dismissHint: 'Puedes cerrarlo por ahora, pero en el dia limite quedara bloqueado hasta cambiarla.',
      deadlineExpired: 'Plazo vencido. Debes cambiarla ahora.',
      currentPassword: 'Contrasena actual',
      newPassword: 'Nueva contrasena',
      closeAria: 'Cerrar aviso de cambio obligatorio de contrasena',
      samePasswordError: 'La nueva contrasena debe ser diferente a la actual',
      updateError: 'No se pudo actualizar la contrasena',
    },
    shiftReminder: {
      title: 'Recuerda fichar la salida',
      message: 'Tu jornada se acerca al limite de 7 horas y media. Cuando finalices, registra la salida para evitar errores.',
      workedLabel: 'Tiempo acumulado hoy:',
      targetLabel: 'Aviso previo a:',
      acknowledge: 'Entendido',
    },
    errors: {
      generic: 'Error inesperado',
      invalidSession: 'Sesion no valida para trabajador',
      clockError: 'No se pudo registrar el evento',
      gpsRequired: 'No se pudo obtener tu ubicacion. Activa permisos y espera a que el GPS se cargue antes de fichar.',
    },
  },

  dashboard: {
    title: 'Dashboard',
    subtitle: 'Vista general del sistema de fichaje',
    cards: {
      activeWorkers: 'Trabajadores activos',
      clockedInWorkers: 'Trabajadores fichados ahora',
      todayEvents: 'Eventos hoy',
      openIncidents: 'Incidencias abiertas',
      moreWorkers: 'mas',
    },
    actions: {
      createWorker: 'Crear trabajador',
      generateExport: 'Generar export',
      viewActive: 'Ver activos',
      viewClockedIn: 'Ver fichados ahora',
      goToExports: 'Ir a exports',
      viewIncidents: 'Ver historial de incidencias',
    },
    incidents: {
      longOpenShift: 'Jornada abierta demasiado tiempo',
      detectedAt: 'Detectada:',
      noPhone: 'Sin telefono',
    },
    errors: {
      loadError: 'Error al cargar',
      retry: 'Reintentar',
      generic: 'Error inesperado',
    },
  },

  incidencias: {
    title: 'Incidencias',
    subtitle: 'Historial completo de incidencias y correcciones',
    filters: {
      status: 'Estado',
      search: 'Buscar',
      detectedFrom: 'Detectada desde',
      detectedTo: 'Detectada hasta',
      options: {
        all: 'Todas',
        open: 'Abiertas',
        resolved: 'Resueltas',
        dismissed: 'Descartadas',
      },
      placeholder: 'Nombre, email o telefono',
    },
    table: {
      columns: {
        trabajador: 'Trabajador',
        incidencia: 'Incidencia',
        estado: 'Estado',
        evento: 'Evento relacionado',
        detectada: 'Detectada',
        correccion: 'Correccion',
        acciones: 'Acciones',
      },
      states: {
        open: 'Abierta',
        resolved: 'Resuelta',
        dismissed: 'Descartada',
      },
      correction: {
        yes: 'Corregida',
        no: 'Sin correccion',
      },
    },
    actions: {
      refresh: 'Actualizar',
      openWorker: 'Ver trabajador',
      correctNow: 'Corregir ahora',
    },
    correctionModal: {
      title: 'Corregir incidencia',
      description: 'Se conservara traza de incidencia y de la correccion aplicada.',
    },
    empty: 'No hay incidencias con los filtros seleccionados.',
    errors: {
      generic: 'Error inesperado',
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
      openIncidentsOnly: 'Solo con incidencias abiertas',
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
        telefono: 'Telefono',
        incidencia: 'Incidencia',
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
      sendCredentials: 'Enviar credenciales',
      viewCredentials: 'Ver credenciales',
      copyMessage: 'Copiar mensaje',
      openWhatsapp: 'Abrir WhatsApp',
      clearFilters: 'Limpiar filtros',
    },
    info: {
      onboardingSummary: 'Mensajes preparados: {ready}. Sin telefono: {noPhone}. Fallidos: {failed}.',
      manualLinksTitle: 'Abre manualmente estos chats de WhatsApp para completar el envio:',
      openingChatTitle: 'Abriendo chat de WhatsApp...',
      openingChatBody: 'Preparando el chat de WhatsApp con credenciales...',
      preparedCredentialsTitle: 'Credenciales preparadas para envio',
      credentialsPreparedAndCopied: 'Credenciales preparadas y mensaje copiado al portapapeles.',
    },
    incidents: {
      longOpenShift: 'Jornada abierta demasiado tiempo',
      badge: 'Incidencia abierta',
    },
    errors: {
      selectAtLeastOne: 'Selecciona al menos un trabajador para enviar credenciales.',
      popupBlocked: 'El navegador bloqueo algunas ventanas emergentes. Usa los enlaces manuales para abrir los chats.',
      noPhoneForWhatsapp: 'No se pudo abrir WhatsApp porque el trabajador no tiene telefono valido para envio.',
      credentialsPrepareFailed: 'No se pudieron preparar credenciales para enviar por WhatsApp.',
      whatsappUrlMissing: 'No se pudo construir el enlace de WhatsApp para este trabajador.',
      clipboardFailed: 'No se pudo copiar al portapapeles automaticamente. Copia el mensaje manualmente.',
      generic: 'Error inesperado',
    },
  },

  workerDetail: {
    title: 'Detalle de trabajador',
    sections: {
      basicInfo: 'Informacion basica',
      incidents: 'Incidencias abiertas',
      password: 'Contrasena',
      timeEvents: 'Historial de fichajes',
      dangerZone: 'Acciones peligrosas',
    },
    fields: {
      nombre: 'Nombre',
      email: 'Email',
      telefono: 'Telefono',
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
      todayRealtime: 'Fichaje de hoy (tiempo real)',
      latestJourneyTitle: 'Ultima jornada registrada',
      dateLabel: 'Fecha:',
      inLabel: 'Entrada:',
      outLabel: 'Salida:',
      totalLabel: 'Total:',
      pending: 'Pendiente',
      latestJourneyOnly: 'Eventos de la ultima jornada',
      fullHistory: 'Historial completo',
      showFullHistory: 'Ver historial completo',
      showLatestOnly: 'Ver solo ultima jornada',
    },
    dangerZone: {
      warning: 'Estas acciones son irreversibles y quedan registradas en el sistema.',
    },
    backToWorkers: 'Volver a trabajadores',
    phone: {
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      placeholder: '+34 600000000',
      formatHelp: 'Formato recomendado: +34 612345678 o 612345678',
    },
    email: {
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      placeholder: 'correo@ejemplo.com',
    },
    correction: {
      action: 'Corregir',
      alreadyCorrected: 'Ya corregido',
      title: 'Corregir fichaje',
      description: 'Se conserva el evento original y se registra una correccion auditada.',
      eventType: 'Tipo corregido',
      happenedAt: 'Hora corregida',
      note: 'Motivo',
      notePlaceholder: 'Explica por que se corrige este fichaje',
      submit: 'Guardar correccion',
      cancel: 'Cancelar',
      correctedBadge: 'Corregido',
      originalLabel: 'Original:',
      reasonLabel: 'Motivo:',
      incidentDetectedBadge: 'Incidencia detectada',
      incidentCorrectedBadge: 'Incidencia corregida',
    },
    location: {
      label: 'Ubicacion:',
      noData: 'Sin GPS',
      accuracy: 'Precision:',
      openMap: 'Ver mapa',
    },
    incidents: {
      longOpenShift: 'Jornada abierta demasiado tiempo',
      detectedAt: 'Detectada:',
      empty: 'Sin incidencias abiertas',
    },
    filters: {
      fromDate: 'Fecha desde',
      toDate: 'Fecha hasta',
      maxEvents: 'Cantidad de eventos',
      eventsOptions: [10, 20, 50, 100, 200],
    },
    errors: {
      generic: 'Error inesperado',
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
      phone: 'Telefono',
      phoneFormatHelp: 'Formato recomendado: +34 612345678 o 612345678',
      password: 'Contrasena inicial',
      placeholders: {
        fullName: 'Introduce el nombre completo',
        email: 'correo@ejemplo.com',
        phone: '+34 600000000',
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
    creatorFallback: 'Usuario del sistema',
    timezone: {
      label: 'Zona horaria',
      peninsula: 'Peninsula (Madrid)',
      canarias: 'Islas Canarias',
    },
    workerFilter: {
      label: 'Trabajador (opcional)',
      all: 'Todos los trabajadores',
    },
    errors: {
      downloadFailed: 'DOWNLOAD_FAILED',
      generic: 'Error inesperado',
    },
    fileNames: {
      base: 'fichajes',
      fromPrefix: 'fichajes_desde',
      toPrefix: 'fichajes_hasta',
      rangeJoin: '_a_',
      separator: '_',
      extension: '.csv',
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
      pending: 'pendiente',
      checking: 'comprobando...',
      ok: 'ok',
      error: 'error',
      cards: {
        dashboard: 'Dashboard',
        workers: 'Trabajadores',
        exports: 'Exports',
      },
    },
    password: {
      title: 'Seguridad de sesion',
      userLabel: 'Usuario actual',
      currentPlaceholder: 'Contrasena actual',
      newPlaceholder: 'Nueva contrasena',
      action: 'Actualizar contrasena',
      success: 'Contrasena actualizada correctamente',
      saving: 'Actualizando...',
    },
    errors: {
      generic: 'Error inesperado',
    },
  },

  sidebar: {
    aria: {
      openMenu: 'Abrir menu',
      closeMenu: 'Cerrar menu',
    },
  },

  timeline: {
    defaultTitle: 'Jornada en tiempo real',
    hours: {
      start: '00:00',
      six: '06:00',
      twelve: '12:00',
      eighteen: '18:00',
      end: '23:59',
    },
    currentPointAria: 'Punto actual de jornada',
    activeTitlePrefix: 'Jornada activa',
  },

  api: {
    missingSupabaseUrl: 'Falta VITE_SUPABASE_URL o VITE_SUPABASE_FUNCTIONS_URL',
    missingAdminToken: 'No hay token de admin. Define VITE_ADMIN_BEARER_TOKEN o inicia sesion en Supabase.',
    missingSupabaseClient: 'Cliente Supabase no configurado',
    missingSession: 'Sesion no disponible',
    unauthenticatedUser: 'Usuario no autenticado',
    missingUserEmail: 'Usuario sin email',
    invalidCurrentPassword: 'La contrasena actual no es valida',
    roleNotAllowedPrefix: 'Rol no permitido para este portal',
  },

  common: {
    loading: 'Cargando...',
    error: 'Error',
    noData: '-',
    required: '*',
  },
} as const;
