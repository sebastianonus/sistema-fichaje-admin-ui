export interface DashboardMetrics {
  active_workers: number;
  events_today: number;
  clocked_in_workers_count: number;
  clocked_in_workers: Array<{
    id: string;
    full_name: string;
    clock_in_time: string;
  }>;
  open_incidents_count: number;
  open_incidents: Array<{
    id: string;
    full_name: string;
    email: string;
    phone_number?: string | null;
    detected_at: string;
  }>;
}

export interface WorkerSummary {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  is_active: boolean;
  created_at: string;
  last_event: {
    event_type: string;
    happened_at: string;
  } | null;
  open_incident: {
    incident_type: string;
    detected_at: string;
  } | null;
}

export interface WorkerDetail {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;
  is_active: boolean;
  created_at: string;
  open_incidents?: Array<{
    id: string;
    incident_type: string;
    status: string;
    detected_at: string;
    note?: string | null;
  }>;
  incident_history?: Array<{
    id: string;
    user_id: string;
    related_event_id?: string | null;
    incident_type: string;
    status: "OPEN" | "RESOLVED" | "DISMISSED";
    note?: string | null;
    detected_at: string;
    resolved_at?: string | null;
    resolved_by?: string | null;
    created_at: string;
    has_correction?: boolean;
    correction?: {
      id: string;
      note?: string | null;
      corrected_event_type?: string | null;
      corrected_happened_at?: string | null;
      happened_at: string;
      created_by?: string | null;
    } | null;
  }>;
  time_events: Array<{
    id: string;
    event_type: string;
    happened_at: string;
    note?: string | null;
    related_event_id?: string | null;
    corrected_event_type?: string | null;
    corrected_happened_at?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    gps_accuracy_m?: number | null;
  }>;
}

export interface IncidentHistoryItem {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_email: string;
  worker_phone_number?: string | null;
  incident_type: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  note?: string | null;
  detected_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  related_event?: {
    id: string;
    event_type: string;
    happened_at: string;
    latitude?: number | null;
    longitude?: number | null;
    gps_accuracy_m?: number | null;
  } | null;
  has_correction: boolean;
  correction?: {
    id: string;
    note?: string | null;
    corrected_event_type?: string | null;
    corrected_happened_at?: string | null;
    happened_at: string;
    created_by?: string | null;
  } | null;
  can_correct: boolean;
}

export interface ExportRecord {
  id: string;
  created_at: string;
  created_by: string;
  created_by_name?: string;
  export_type: string;
  filters: {
    from?: string;
    to?: string;
    worker_id?: string;
  };
  status: "PENDING" | "READY" | "FAILED" | "DELETED";
  row_count: number | null;
  sha256_hex: string | null;
  csv_bytes: number | null;
  storage_bucket: string;
  storage_path: string | null;
  signed_url_expires_at: string | null;
  error_code: string | null;
  error_message: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
}
