const API_BASE = "http://127.0.0.1:8080/api/v1";

const scopeEl = document.getElementById("scope");
const groupEl = document.getElementById("groupId");
const granularityEl = document.getElementById("granularity");
const fromEl = document.getElementById("from");
const toEl = document.getElementById("to");
const refreshBtn = document.getElementById("refreshBtn");
const tableBody = document.querySelector("#dataTable tbody");

function defaultDates() {
  const to = new Date();
  const from = new Date();
  from.setMonth(to.getMonth() - 3);
  fromEl.value = from.toISOString().slice(0, 10);
  toEl.value = to.toISOString().slice(0, 10);
}

async function loadGroups() {
  const res = await fetch(`${API_BASE}/groups`);
  const data = await res.json();
  groupEl.innerHTML = '<option value="">Seleccione grupo</option>' +
    data.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
}

function toggleGroup() {
  groupEl.disabled = scopeEl.value !== "group";
}

async function loadTable() {
  const params = new URLSearchParams({
    metric: "distance",
    scope: scopeEl.value,
    group_id: groupEl.value,
    granularity: granularityEl.value,
    from: fromEl.value,
    to: toEl.value,
    page: "1",
    page_size: "50"
  });

  const res = await fetch(`${API_BASE}/metrics/table?${params}`);
  const data = await res.json();

  tableBody.innerHTML = data.rows.map(r => `
    <tr>
      <td>${r.bucket}</td>
      <td>${r.device_name}</td>
      <td>${r.device_serial}</td>
      <td>${r.value}</td>
    </tr>
  `).join("");
}

async function refresh() {
  await loadTable();
}

scopeEl.addEventListener("change", toggleGroup);
refreshBtn.addEventListener("click", refresh);

defaultDates();
toggleGroup();
loadGroups().then(refresh);
