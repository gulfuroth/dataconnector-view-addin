const metricEl = document.getElementById("metric");
const scopeEl = document.getElementById("scope");
const groupEl = document.getElementById("groupId");
const granularityEl = document.getElementById("granularity");
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const connectBtn = document.getElementById("connectBtn");
const rememberPasswordEl = document.getElementById("rememberPassword");
const statusEl = document.getElementById("statusText");
const chartEl = document.getElementById("chartPlaceholder");
const tableHead = document.getElementById("dataTableHead");
const tableBody = document.querySelector("#dataTable tbody");

const mygServerEl = document.getElementById("mygServer");
const mygDatabaseEl = document.getElementById("mygDatabase");
const mygUserEl = document.getElementById("mygUser");
const mygPasswordEl = document.getElementById("mygPassword");
const dcBaseUrlEl = document.getElementById("dcBaseUrl");
const DEFAULT_DC_BASE_URL = "https://data-connector.geotab.com/odata/v4/svc/";

const state = {
  groups: [],
  connected: false,
  lastRows: [],
};

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setMonth(to.getMonth() - 3);
  fromEl.value = from.toISOString().slice(0, 10);
  toEl.value = to.toISOString().slice(0, 10);
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? "status error" : "status";
}

function toggleGroup() {
  groupEl.disabled = scopeEl.value !== "group";
}

function getConnectionPayload() {
  return {
    mygServer: mygServerEl.value.trim(),
    mygDatabase: mygDatabaseEl.value.trim(),
    mygUser: mygUserEl.value.trim(),
    mygPassword: mygPasswordEl.value,
    dcBaseUrl: dcBaseUrlEl.value.trim(),
  };
}

function saveConfig() {
  const payload = getConnectionPayload();
  const rememberPassword = !!rememberPasswordEl.checked;
  const local = {
    ...payload,
    mygPassword: rememberPassword ? payload.mygPassword : "",
    rememberPassword,
  };
  localStorage.setItem("dcv_config", JSON.stringify(local));
}

function loadConfig() {
  const raw = localStorage.getItem("dcv_config");
  if (!raw) {
    dcBaseUrlEl.value = DEFAULT_DC_BASE_URL;
    return;
  }
  try {
    const cfg = JSON.parse(raw);
    mygServerEl.value = cfg.mygServer || "my.geotab.com";
    mygDatabaseEl.value = cfg.mygDatabase || "";
    mygUserEl.value = cfg.mygUser || "";
    rememberPasswordEl.checked = !!cfg.rememberPassword;
    mygPasswordEl.value = cfg.rememberPassword ? (cfg.mygPassword || "") : "";
    dcBaseUrlEl.value = cfg.dcBaseUrl || DEFAULT_DC_BASE_URL;
  } catch (_err) {
    dcBaseUrlEl.value = DEFAULT_DC_BASE_URL;
  }
}

function handleRememberPasswordToggle() {
  if (!rememberPasswordEl.checked) {
    const raw = localStorage.getItem("dcv_config");
    if (!raw) return;
    try {
      const cfg = JSON.parse(raw);
      cfg.rememberPassword = false;
      cfg.mygPassword = "";
      localStorage.setItem("dcv_config", JSON.stringify(cfg));
    } catch (_err) {
      // ignore malformed storage
    }
  }
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes("\"") || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
}

function exportRowsToCsv() {
  if (!state.lastRows.length) {
    throw new Error("No hay datos para exportar");
  }
  const header = ["bucket", "device_name", "device_serial", "value"];
  const lines = [header.join(",")];
  for (const row of state.lastRows) {
    lines.push([
      csvEscape(row.bucket),
      csvEscape(row.device_name),
      csvEscape(row.device_serial),
      csvEscape(Number(row.value).toFixed(2)),
    ].join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `dataconnector_${metricEl.value}_${granularityEl.value}_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderChart(points) {
  if (!points.length) {
    chartEl.textContent = "Sin datos para el filtro seleccionado";
    return;
  }

  const width = 980;
  const height = 260;
  const pad = 34;
  const values = points.map((p) => Number(p.value));
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const span = Math.max(maxVal - minVal, 1);

  const toX = (i) => pad + (i * (width - pad * 2)) / Math.max(points.length - 1, 1);
  const toY = (v) => height - pad - ((v - minVal) / span) * (height - pad * 2);

  const polyline = points
    .map((p, i) => `${toX(i).toFixed(2)},${toY(Number(p.value)).toFixed(2)}`)
    .join(" ");

  const maxTicks = 6;
  const step = Math.max(1, Math.floor((points.length - 1) / Math.max(1, maxTicks - 1)));
  const tickIndexes = [];
  for (let i = 0; i < points.length; i += step) tickIndexes.push(i);
  if (tickIndexes[tickIndexes.length - 1] !== points.length - 1) tickIndexes.push(points.length - 1);

  const tickMarks = tickIndexes.map((idx) => {
    const x = toX(idx).toFixed(2);
    const label = points[idx].bucket;
    return `
      <line x1="${x}" y1="${height - pad}" x2="${x}" y2="${height - pad + 5}" stroke="#94a3b8" stroke-width="1" />
      <text x="${x}" y="${height - 8}" text-anchor="middle" font-size="10" fill="#475569">${label}</text>
    `;
  }).join("");

  chartEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="Evolución temporal">
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#94a3b8" stroke-width="1" />
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#94a3b8" stroke-width="1" />
      <polyline fill="none" stroke="#0f766e" stroke-width="2.5" points="${polyline}" />
      ${tickMarks}
    </svg>
  `;
}

function renderPivotTable(rows) {
  if (!rows.length) {
    tableHead.innerHTML = "<tr><th>Nombre vehículo</th><th>Serial</th></tr>";
    tableBody.innerHTML = "";
    return;
  }

  const buckets = Array.from(new Set(rows.map((r) => r.bucket))).sort((a, b) => a.localeCompare(b));
  const byVehicle = new Map();

  for (const r of rows) {
    const key = `${r.device_name}|||${r.device_serial}`;
    if (!byVehicle.has(key)) {
      byVehicle.set(key, {
        device_name: r.device_name,
        device_serial: r.device_serial,
        values: new Map(),
      });
    }
    const entry = byVehicle.get(key);
    const prev = entry.values.get(r.bucket) || 0;
    entry.values.set(r.bucket, prev + Number(r.value));
  }

  const vehicles = Array.from(byVehicle.values()).sort((a, b) => {
    const nameCmp = a.device_name.localeCompare(b.device_name);
    if (nameCmp !== 0) return nameCmp;
    return a.device_serial.localeCompare(b.device_serial);
  });

  tableHead.innerHTML = `
    <tr>
      <th>Nombre vehículo</th>
      <th>Serial</th>
      ${buckets.map((b) => `<th>${b}</th>`).join("")}
    </tr>
  `;

  tableBody.innerHTML = vehicles.map((v) => `
    <tr>
      <td>${v.device_name}</td>
      <td>${v.device_serial}</td>
      ${buckets.map((b) => {
        const value = v.values.get(b);
        return `<td>${value === undefined ? "-" : Number(value).toFixed(2)}</td>`;
      }).join("")}
    </tr>
  `).join("");
}

async function apiPost(path, payload) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  return data;
}

async function connect() {
  try {
    const payload = getConnectionPayload();
    setStatus("Conectando...");
    const data = await apiPost("/api/connect", payload);
    state.groups = data.groups || [];
    groupEl.innerHTML = '<option value="">Seleccione grupo</option>' +
      state.groups.map((g) => `<option value="${g.id}">${g.name}</option>`).join("");
    state.connected = true;
    saveConfig();
    setStatus(`Conectado. Grupos: ${state.groups.length}`);
  } catch (err) {
    state.connected = false;
    setStatus(err.message, true);
  }
}

async function loadAndRender() {
  if (!state.connected) throw new Error("Conecta primero");
  if (scopeEl.value === "group" && !groupEl.value) {
    throw new Error("Selecciona grupo");
  }

  const payload = {
    ...getConnectionPayload(),
    metric: metricEl.value,
    scope: scopeEl.value,
    groupId: groupEl.value || null,
    granularity: granularityEl.value,
    from: fromEl.value,
    to: toEl.value,
  };

  const data = await apiPost("/api/query", payload);
  const rows = data.rows || [];
  const points = data.points || [];

  renderChart(points);
  state.lastRows = rows;

  renderPivotTable(rows);

  setStatus(`Datos cargados. Filas base: ${rows.length}`);
}

scopeEl.addEventListener("change", () => {
  toggleGroup();
  if (scopeEl.value === "fleet") {
    groupEl.value = "";
  }
});
refreshBtn.addEventListener("click", async () => {
  try {
    setStatus("Consultando...");
    await loadAndRender();
  } catch (err) {
    setStatus(err.message, true);
  }
});
exportBtn.addEventListener("click", () => {
  try {
    exportRowsToCsv();
    setStatus(`CSV exportado. Filas: ${state.lastRows.length}`);
  } catch (err) {
    setStatus(err.message, true);
  }
});
connectBtn.addEventListener("click", connect);
rememberPasswordEl.addEventListener("change", handleRememberPasswordToggle);

loadConfig();
defaultDates();
toggleGroup();
