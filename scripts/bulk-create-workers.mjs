import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_REF = "lqhpfaylivoynfwxwskz";
const DEFAULT_TEMP_PASSWORD = "ONUS1111";

function parseCsvLine(line, separator = ";") {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === separator && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out.map((v) => v.trim());
}

function parseCsvFile(filePath, separator = ";") {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0], separator);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = parseCsvLine(lines[i], separator);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

function fixMojibake(value) {
  if (!value) return value;
  if (!/[ÃÂï¿½]/.test(value)) return value;
  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return value;
  }
}

function normalizeName(name) {
  const fixed = fixMojibake(String(name || "").trim());
  if (!fixed) return "";
  const lower = fixed.toLocaleLowerCase("es-ES");
  return lower
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("es-ES") + part.slice(1))
    .join(" ");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return null;

  let normalized = raw.replace(/[^\d+]/g, "");
  if (!normalized) return null;

  if (normalized.startsWith("+")) {
    normalized = `+${normalized.slice(1).replace(/\D/g, "")}`;
  } else {
    normalized = normalized.replace(/\D/g, "");
  }

  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  if (!normalized || normalized === "+") return null;
  if (normalized.startsWith("+") && normalized.slice(1).length === 9) return normalized.slice(1);
  return normalized;
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (s.includes(";") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, "\"\"")}"`;
  }
  return s;
}

function toTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function getServiceRoleKeyFromCli() {
  const out = execSync(`supabase projects api-keys --project-ref ${PROJECT_REF}`, {
    encoding: "utf8",
  });
  const m = out.match(/service_role\s+\|\s+([A-Za-z0-9._-]+)/);
  if (!m?.[1]) {
    throw new Error("No se pudo obtener service_role key desde Supabase CLI.");
  }
  return m[1];
}

async function fetchAuthUsers({ supabaseUrl, serviceRoleKey }) {
  const users = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Error listando auth users (${res.status}): ${JSON.stringify(data)}`);
    }
    const batch = data?.users || [];
    users.push(...batch);
    if (batch.length < 1000) break;
    page += 1;
  }
  return users;
}

async function createAuthUser({ supabaseUrl, serviceRoleKey, email, password }) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function upsertProfile({ supabaseUrl, serviceRoleKey, profile }) {
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([profile]),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Error upsert profiles (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const adminUiDir = process.cwd();
  const downloadsDir = path.join(process.env.USERPROFILE || "C:\\Users\\ATAI", "Downloads");
  const empleadosPath = path.join(downloadsDir, "onus_empleados_para_alta.csv");
  const phonesPath = path.join(downloadsDir, "telefonos_match_empleados.csv");
  if (!fs.existsSync(empleadosPath)) throw new Error(`No existe ${empleadosPath}`);
  if (!fs.existsSync(phonesPath)) throw new Error(`No existe ${phonesPath}`);

  const envPath = path.join(adminUiDir, ".env");
  const envText = fs.readFileSync(envPath, "utf8");
  const supabaseUrl = envText.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
  if (!supabaseUrl) throw new Error("Falta VITE_SUPABASE_URL en .env");

  const serviceRoleKey = getServiceRoleKeyFromCli();
  const allAuthUsers = await fetchAuthUsers({ supabaseUrl, serviceRoleKey });
  const authByEmail = new Map(
    allAuthUsers
      .map((u) => [normalizeEmail(u?.email), u?.id])
      .filter(([email, id]) => email && id),
  );

  const empleados = parseCsvFile(empleadosPath, ";");
  const phones = parseCsvFile(phonesPath, ";");
  const phoneByEmail = new Map();
  for (const row of phones) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    const phone = normalizePhone(row.telefono);
    if (phone) phoneByEmail.set(email, phone);
  }

  const results = [];
  const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  for (const row of empleados) {
    const email = normalizeEmail(row.email);
    const fullName = normalizeName(row.nombre);
    const tipo = String(row.tipo_trabajador || "").trim().toLowerCase();
    const phone = phoneByEmail.get(email) ?? null;
    const isActive = tipo !== "sin_clasificar";

    if (!email || !fullName) {
      results.push({
        nombre: fullName || row.nombre || "",
        email,
        tipo_trabajador: tipo,
        telefono: phone ?? "",
        estado: "SKIPPED",
        detalle: "Fila invalida (sin nombre o email)",
        temp_password: "",
      });
      continue;
    }

    let userId = authByEmail.get(email) ?? null;
    let status = "EXISTS";
    let detail = "";
    let tempPassword = "";

    if (!userId) {
      const created = await createAuthUser({
        supabaseUrl,
        serviceRoleKey,
        email,
        password: DEFAULT_TEMP_PASSWORD,
      });

      if (created.status >= 200 && created.status < 300 && created.data?.id) {
        userId = created.data.id;
        authByEmail.set(email, userId);
        status = "CREATED";
        tempPassword = DEFAULT_TEMP_PASSWORD;
      } else {
        const err = String(created?.data?.msg || created?.data?.error_description || created?.data?.error || "");
        if (/already exists|already registered|user already registered/i.test(err)) {
          userId = authByEmail.get(email) ?? null;
          status = "EXISTS";
          detail = err;
        } else {
          results.push({
            nombre: fullName,
            email,
            tipo_trabajador: tipo,
            telefono: phone ?? "",
            estado: "ERROR",
            detalle: err || `AUTH_CREATE_${created.status}`,
            temp_password: "",
          });
          continue;
        }
      }
    }

    if (!userId) {
      results.push({
        nombre: fullName,
        email,
        tipo_trabajador: tipo,
        telefono: phone ?? "",
        estado: "ERROR",
        detalle: detail || "No se pudo resolver auth user id",
        temp_password: "",
      });
      continue;
    }

    await upsertProfile({
      supabaseUrl,
      serviceRoleKey,
      profile: {
        id: userId,
        role: "worker",
        full_name: fullName,
        phone_number: phone,
        is_active: isActive,
        password_reset_required: true,
        password_reset_deadline: deadline,
        password_changed_at: null,
      },
    });

    results.push({
      nombre: fullName,
      email,
      tipo_trabajador: tipo,
      telefono: phone ?? "",
      estado: status,
      detalle: detail,
      temp_password: tempPassword,
    });
  }

  const ts = toTimestamp();
  const outJson = path.join(downloadsDir, `alta_trabajadores_resultado_${ts}.json`);
  const outCsv = path.join(downloadsDir, `alta_trabajadores_resultado_${ts}.csv`);
  fs.writeFileSync(outJson, JSON.stringify(results, null, 2), "utf8");

  const header = ["nombre", "email", "tipo_trabajador", "telefono", "estado", "detalle", "temp_password"];
  const csvLines = [
    header.join(";"),
    ...results.map((r) => header.map((k) => csvEscape(r[k])).join(";")),
  ];
  fs.writeFileSync(outCsv, `${csvLines.join("\n")}\n`, "utf8");

  const stats = results.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.estado === "CREATED") acc.created += 1;
      else if (r.estado === "EXISTS") acc.exists += 1;
      else if (r.estado === "ERROR") acc.errors += 1;
      else acc.skipped += 1;
      return acc;
    },
    { total: 0, created: 0, exists: 0, errors: 0, skipped: 0 },
  );

  console.log("Alta masiva completada:");
  console.log(stats);
  console.log(`Reporte CSV: ${outCsv}`);
  console.log(`Reporte JSON: ${outJson}`);
}

main().catch((err) => {
  console.error("ERROR:", err.message);
  process.exit(1);
});
