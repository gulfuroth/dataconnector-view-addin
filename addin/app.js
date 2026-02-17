const METRIC_COLUMN = {
  distance: "Distance_Km",
  fuel: "FuelUsed_Litres",
};

const TABLE_BY_GRANULARITY = {
  daily: "VehicleKpi_Daily",
  monthly: "VehicleKpi_Monthly",
};

const metricEl = document.getElementById("metric");
const scopeEl = document.getElementById("scope");
const groupEl = document.getElementById("groupId");
const granularityEl = document.getElementById("granularity");
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const refreshBtn = document.getElementById("refreshBtn");
const connectBtn = document.getElementById("connectBtn");
const statusEl = document.getElementById("statusText");
const chartEl = document.getElementById("chartPlaceholder");
const tableBody = document.querySelector("#dataTable tbody");

const mygServerEl = document.getElementById("mygServer");
const mygDatabaseEl = document.getElementById("mygDatabase");
const mygUserEl = document.getElementById("mygUser");
const mygPasswordEl = document.getElementById("mygPassword");
const dcBaseUrlEl = document.getElementById("dcBaseUrl");
const dcTokenEl = document.getElementById("dcToken");

const state = {
  mygCredentials: null,
  groups: [],
  connected: false,
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

function saveConfig() {
  const payload = {
    mygServer: mygServerEl.value.trim(),
    mygDatabase: mygDatabaseEl.value.trim(),
    mygUser: mygUserEl.value.trim(),
    dcBaseUrl: dcBaseUrlEl.value.trim(),
    dcToken: dcTokenEl.value,
  };
  localStorage.setItem("dcv_config", JSON.stringify(payload));
}

function loadConfig() {
  const raw = localStorage.getItem("dcv_config");
  if (!raw) return;
  try {
    const cfg = JSON.parse(raw);
    mygServerEl.value = cfg.mygServer || "my.geotab.com";
    mygDatabaseEl.value = cfg.mygDatabase || "";
    mygUserEl.value = cfg.mygUser || "";
    dcBaseUrlEl.value = cfg.dcBaseUrl || "";
    dcTokenEl.value = cfg.dcToken || "";
  } catch (_err) {
    // ignore malformed local storage
  }
}

async function mygRpc(method, params) {
  const server = mygServerEl.value.trim();
  const res = await fetch(`https://${server}/apiv1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  if (!res.ok) {
    throw new Error(`MyGeotab HTTP ${res.status}`);
  }
  const payload = await res.json();
  if (payload.error) {
    throw new Error(payload.error.message || "MyGeotab API error");
  }
  return payload.result;
}

async function mygAuthenticate() {
  const database = mygDatabaseEl.value.trim();
  const userName = mygUserEl.value.trim();
  const password = mygPasswordEl.value;

  if (!database || !userName || !password) {
    throw new Error("Faltan credenciales MyGeotab");
  }

  const result = await mygRpc("Authenticate", { database, userName, password });
  const credentials = result.credentials || result;
  if (!credentials) throw new Error("No credentials from MyGeotab");
  state.mygCredentials = credentials;
}

async function mygListGroups() {
  const groups = await mygRpc("Get", {
    typeName: "Group",
    credentials: state.mygCredentials,
  });
  return (groups || [])
    .filter((g) => g.id && g.name)
    .map((g) => ({ id: g.id, name: g.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function mygListDeviceSerialsByGroup(groupId) {
  const candidates = [
    { groups: [{ id: groupId }] },
    { groups: [groupId] },
    { groups: [{ Id: groupId }] },
  ];

  for (const search of candidates) {
    try {
      const devices = await mygRpc("Get", {
        typeName: "Device",
        credentials: state.mygCredentials,
        search,
      });
      if (!Array.isArray(devices)) continue;
      const serials = devices
        .map((d) => (d.serialNumber || "").trim())
        .filter(Boolean);
      if (serials.length > 0) return Array.from(new Set(serials));
    } catch (_err) {
      // try next shape
    }
  }
  return [];
}

async function dcQuery(table, selectCols, filterExpr) {
  const baseUrl = dcBaseUrlEl.value.trim().replace(/\/$/, "");
  const token = dcTokenEl.value;
  if (!baseUrl || !token) {
    throw new Error("Falta Data Connector Base URL o Token");
  }

  let url = `${baseUrl}/${table}`;
  let params = new URLSearchParams({
    $select: selectCols.join(","),
    $top: "1000",
  });
  if (filterExpr) params.set("$filter", filterExpr);

  const out = [];
  while (url) {
    const reqUrl = params ? `${url}?${params}` : url;
    const res = await fetch(reqUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`Data Connector HTTP ${res.status}`);
    const data = await res.json();
    out.push(...(data.value || []));
    url = data["@odata.nextLink"] || "";
    params = null;
    if (out.length > 50000) break;
  }

  return out;
}

function buildDateFilter() {
  const start = `${fromEl.value}T00:00:00Z`;
  const end = `${toEl.value}T23:59:59Z`;
  return `DateTime ge ${start} and DateTime le ${end}`;
}

function buildSerialFilter(serials) {
  if (!serials || !serials.length) return "";
  return "(" + serials.map((s) => `SerialNo eq '${s.replace(/'/g, "''")}'`).join(" or ") + ")";
}

function toBucket(rawDate, granularity) {
  if (!rawDate) return "";
  return granularity === "monthly" ? rawDate.slice(0, 7) : rawDate.slice(0, 10);
}

function renderChart(points) {
  if (!points.length) {
    chartEl.textContent = "Sin datos para el filtro seleccionado";
    return;
  }

  const width = 980;
  const height = 260;
  const pad = 26;
  const values = points.map((p) => Number(p.value));
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const span = Math.max(maxVal - minVal, 1);

  const toX = (i) => pad + (i * (width - pad * 2)) / Math.max(points.length - 1, 1);
  const toY = (v) => height - pad - ((v - minVal) / span) * (height - pad * 2);

  const polyline = points
    .map((p, i) => `${toX(i).toFixed(2)},${toY(Number(p.value)).toFixed(2)}`)
    .join(" ");

  chartEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="Evolución temporal">
      <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="#94a3b8" stroke-width="1" />
      <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" stroke="#94a3b8" stroke-width="1" />
      <polyline fill="none" stroke="#0f766e" stroke-width="2.5" points="${polyline}" />
    </svg>
  `;
}

function aggregateTimeseries(rows) {
  const agg = new Map();
  for (const r of rows) {
    agg.set(r.bucket, (agg.get(r.bucket) || 0) + Number(r.value));
  }
  return Array.from(agg.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucket, value]) => ({ bucket, value }));
}

async function loadAndRender() {
  if (!state.connected) throw new Error("Conecta primero");

  if (scopeEl.value === "group" && !groupEl.value) {
    throw new Error("Selecciona grupo");
  }

  const metric = metricEl.value;
  const granularity = granularityEl.value;
  const table = TABLE_BY_GRANULARITY[granularity];
  const valueCol = METRIC_COLUMN[metric];

  let serials = [];
  if (scopeEl.value === "group") {
    serials = await mygListDeviceSerialsByGroup(groupEl.value);
    if (!serials.length) {
      tableBody.innerHTML = "";
      renderChart([]);
      setStatus("No hay dispositivos en ese grupo");
      return;
    }
  }

  const filters = [buildDateFilter()];
  const serialFilter = buildSerialFilter(serials);
  if (serialFilter) filters.push(serialFilter);

  const metricRows = await dcQuery(table, ["DateTime", "SerialNo", valueCol], filters.join(" and "));

  const metadataSerials = Array.from(new Set(metricRows.map((r) => r.SerialNo).filter(Boolean)));
  const metadataFilter = buildSerialFilter(metadataSerials);
  const metadataRows = await dcQuery("LatestVehicleMetadata", ["SerialNo", "DeviceName", "DateTime"], metadataFilter);

  const metaMap = new Map();
  for (const m of metadataRows) {
    const serial = (m.SerialNo || "").trim();
    if (!serial) continue;
    const prev = metaMap.get(serial);
    const dt = m.DateTime || "";
    if (!prev || dt > prev.dt) {
      metaMap.set(serial, { dt, name: (m.DeviceName || serial).trim() });
    }
  }

  const rows = metricRows
    .filter((r) => r.SerialNo && r[valueCol] !== null && r[valueCol] !== undefined)
    .map((r) => {
      const serial = (r.SerialNo || "").trim();
      return {
        bucket: toBucket(r.DateTime || "", granularity),
        device_serial: serial,
        device_name: (metaMap.get(serial)?.name || serial),
        value: Number(r[valueCol]),
      };
    })
    .filter((r) => r.bucket)
    .sort((a, b) => {
      const d = a.bucket.localeCompare(b.bucket);
      if (d !== 0) return d;
      return a.device_name.localeCompare(b.device_name);
    });

  const points = aggregateTimeseries(rows);
  renderChart(points);

  tableBody.innerHTML = rows.slice(0, 500).map((r) => `
    <tr>
      <td>${r.bucket}</td>
      <td>${r.device_name}</td>
      <td>${r.device_serial}</td>
      <td>${r.value.toFixed(2)}</td>
    </tr>
  `).join("");

  setStatus(`Datos cargados. Filas: ${rows.length}${rows.length > 500 ? " (mostrando 500)" : ""}`);
}

async function connect() {
  try {
    setStatus("Conectando...");
    await mygAuthenticate();
    state.groups = await mygListGroups();
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

scopeEl.addEventListener("change", toggleGroup);
refreshBtn.addEventListener("click", async () => {
  try {
    setStatus("Consultando...");
    await loadAndRender();
  } catch (err) {
    setStatus(err.message, true);
  }
});
connectBtn.addEventListener("click", connect);

loadConfig();
defaultDates();
toggleGroup();
