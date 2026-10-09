/**
 * analytics.js
 * Renders the Cloud Health breakdown, the scoring-rules modal, and the
 * live storage and file-health analytics from AWS.
 */

document.addEventListener("DOMContentLoaded", async () => {
  renderShell("analytics");

  await loadAnalytics();
});
async function loadAnalytics() {
  pageState("Loading storage analytics…");
  document.getElementById("howCalculatedBtn").disabled=true;
  try {
  const dashboard = await api.getDashboardStats();
  const { health, storage, summary } = dashboard;

  health.breakdown = [
    { label: "Healthy files", detail: `${summary.healthy} files`, value: summary.healthy, isNeutral: true },
    { label: "Duplicate files", penalty: -Math.min(summary.duplicates * 10, 30), value: summary.duplicates },
    { label: "Inactive files", penalty: -Math.min(summary.inactive * 5, 25), value: summary.inactive },
    { label: "Large files", penalty: -Math.min(summary.large * 3, 15), value: summary.large },
  ];
  health.scoringRules = [
    { label: "Starting score", value: "100" },
    { label: `Duplicate files (${summary.duplicates} × 10, maximum 30)`, value: `−${Math.min(summary.duplicates * 10, 30)}` },
    { label: `Inactive files (${summary.inactive} × 5, maximum 25)`, value: `−${Math.min(summary.inactive * 5, 25)}` },
    { label: `Large files (${summary.large} × 3, maximum 15)`, value: `−${Math.min(summary.large * 3, 15)}` },
    { label: "Current health score", value: String(health.score), isFinal: true },
  ];

  renderHealthDeepDive(health);
  renderStorageBars(storage);
  renderFileHealth(summary);

  document.getElementById("howCalculatedBtn").disabled=false;
  document.getElementById("howCalculatedBtn").onclick=()=>openScoringModal(health);
  document.getElementById('analyticsDistribution').innerHTML=distributionHTML(storage);
  document.getElementById('breakdownDetails').onclick=()=>showDetails('breakdown',dashboard);
  pageState();
  try {
    const files=await api.getFiles();
    document.getElementById('storageActivity').innerHTML=activityHTML(files);
    document.getElementById('activityDetails').disabled=false;
    document.getElementById('activityDetails').onclick=()=>showDetails('activity',dashboard,files);
  } catch(error) { console.error(error);document.getElementById('storageActivity').textContent='Activity unavailable.';pageState('File activity could not be loaded.',true,loadAnalytics); }
  } catch(error) { console.error(error);pageState('We could not load storage analytics.',true,loadAnalytics); }
}

function renderHealthDeepDive(health) {
  const el = document.getElementById("healthDeepDive");
  el.innerHTML = `
    <div class="health-card" style="margin-bottom:22px;">
      ${ringHTML(health.score,health.max)}
      <div class="health-info">
        <span class="health-badge">${health.label}</span>
        <h3>Cloud Health Score</h3>
        <p class="desc">${health.subtitle}</p>
      </div>
    </div>
    <div class="bar-chart-list">
      ${health.breakdown.map((b) => `
        <div class="bar-chart-row" style="grid-template-columns: 150px 1fr 80px;">
          <span class="bar-chart-label">${b.label}</span>
          <div class="bar-chart-track">
            <div class="bar-chart-fill" style="width:${b.isNeutral ? 100 : Math.min(100, Math.abs(b.penalty) * 6)}%; background:${b.isNeutral ? "var(--teal-accent)" : "var(--red)"}"></div>
          </div>
          <span class="bar-chart-value">${b.isNeutral ? b.detail : b.penalty}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function openScoringModal(health) {
  const modal = openModal(`
    <h3 class="modal-title">How the Cloud Health Score is calculated</h3>
    <p class="modal-message">
      The score starts at 100 and subtracts a penalty for every issue CloudSense AI detects.
      These penalties use the current duplicate, inactive and large-file counts returned by
      the CloudSense dashboard Lambda.
    </p>
    <div class="bar-chart-list">
      ${health.scoringRules.map((r) => `
        <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); ${r.isFinal ? "font-weight:500;" : ""}">
          <span style="font-size:13px; ${r.isFinal ? "" : "color:var(--text-600);"}">${r.label}</span>
          <span class="mono" style="font-size:13px;">${r.value}</span>
        </div>
      `).join("")}
    </div>
    <div class="modal-actions" style="margin-top:18px;">
      <button class="btn btn-primary" id="closeScoringBtn">Got it</button>
    </div>
  `);
  document.getElementById("closeScoringBtn").addEventListener("click", () => {
    modal.close();
  });
}

function renderStorageBars(storage) {
  const el = document.getElementById("storageBreakdown");
  const largest = Math.max(...storage.breakdown.map((b) => Number(b.bytes || 0)), 1);
  el.innerHTML = storage.breakdown.map((b) => `
    <div class="bar-chart-row">
      <span class="bar-chart-label">${b.category}</span>
      <div class="bar-chart-track">
        <div class="bar-chart-fill" style="width:${(Number(b.bytes || 0) / largest) * 100}%; background:${b.color}"></div>
      </div>
      <span class="bar-chart-value">${b.formattedSize}</span>
    </div>
  `).join("");
}

function renderFileHealth(summary) {
  const el = document.getElementById("healthTrendChart");
  const total = Math.max(Number(summary.totalFiles || 0), 1);
  const groups = [
    { label: "Healthy", value: summary.healthy, color: "#14b8a6" },
    { label: "Duplicate", value: summary.duplicates, color: "#ef4444" },
    { label: "Inactive", value: summary.inactive, color: "#f59e0b" },
    { label: "Large", value: summary.large, color: "#8b5cf6" },
  ];

  el.innerHTML = `<div class="bar-chart-list">${groups.map((group) => `
    <div class="bar-chart-row">
      <span class="bar-chart-label">${group.label}</span>
      <div class="bar-chart-track">
        <div class="bar-chart-fill" style="width:${(group.value / total) * 100}%; background:${group.color}"></div>
      </div>
      <span class="bar-chart-value">${group.value}</span>
    </div>
  `).join("")}</div>`;
}
