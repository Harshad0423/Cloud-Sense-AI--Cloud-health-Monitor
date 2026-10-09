// Fresh AWS snapshots; local text downloads, without email delivery.
document.addEventListener("DOMContentLoaded", async () => {
  renderShell("reports");
  document.getElementById("generateReportBtn").addEventListener("click", handleGenerateReport);
  pageState("Loading current report…");
  try { renderReport(await loadReport());pageState(); }
  catch (error) {
    document.getElementById("reportDoc").textContent = "Unable to load report. Click Generate Report to retry.";
    console.error(error);pageState("Report unavailable. Generate Report to retry.",true);
    toast(error.message, "error");
  }
});

function reportEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function loadReport() {
  const [dashboard, recommendations] = await Promise.all([
    api.getDashboardStats(), api.getRecommendations()
  ]);
  return { ...dashboard, recommendations, generatedAt: new Date().toISOString() };
}

function reportMetrics(report) {
  const { health, storage, summary } = report;
  return [
    ["Cloud Health Score", `${health.score}/${health.max} (${health.label})`],
    ["Storage Used", storage.formattedUsed],
    ["Total Files", summary.totalFiles],
    ["Healthy Files", summary.healthy],
    ["Duplicate Files", summary.duplicates],
    ["Inactive Files", summary.inactive],
    ["Large Files", summary.large],
    ["Recoverable Storage", summary.potentialSavings]
  ];
}

function renderReport(report) {
  const recommendations = report.recommendations;
  document.getElementById("reportDoc").innerHTML = `
    <div class="report-doc-header">
      <h2>Storage Health Report</h2>
      <p>Generated ${reportEscape(new Date(report.generatedAt).toLocaleString())} · Live AWS data</p>
    </div>
    <div class="report-metric-row">${reportMetrics(report).map(([label, value]) => `
      <div class="report-metric">
        <div class="rlabel">${reportEscape(label)}</div>
        <div class="rvalue">${reportEscape(value)}</div>
      </div>`).join("")}
    </div>
    <h3 style="font-size:14px;margin-bottom:10px;">Recommendations</h3>
    ${recommendations.length ? `<ul class="report-list">${recommendations.map(rec =>
      `<li>${reportEscape(rec.fileName)}: ${reportEscape(rec.recommendation)}</li>`
    ).join("")}</ul>` : "<p>No current recommendations.</p>"}
    <p class="text-muted" style="font-size:12px;margin-top:18px;">
      Current snapshot, not weekly history. Inactivity uses last access when available,
      otherwise upload date. Recoverable storage is an estimate, not monetary savings.
    </p>`;
}

async function handleGenerateReport() {
  const button = document.getElementById("generateReportBtn");
  if(button.disabled) return;
  button.disabled = true;
  button.textContent = "Generating…";
  try {
    const report = await loadReport();
    renderReport(report);pageState();
    downloadReportAsText(report);
    toast("Live report downloaded", "success");
  } catch (error) {
    console.error(error);pageState("Unable to generate report. Please try again.",true);
    toast(error.message || "Unable to generate report", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Generate Report";
  }
}

function downloadReportAsText(report) {
  const lines = [
    "CLOUDSENSE AI — STORAGE HEALTH REPORT",
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    "Source: Live AWS data (current snapshot)", "",
    ...reportMetrics(report).map(([label, value]) => `${label}: ${value}`),
    "", "Storage by Category:",
    ...report.storage.breakdown.map(category => `- ${category.category}: ${category.formattedSize}`),
    "", "Recommendations:",
    ...(report.recommendations.length ? report.recommendations.map(rec =>
      `- [${rec.priority}] ${rec.fileName}: ${rec.recommendation}`
    ) : ["No current recommendations."]), "",
    "Inactivity uses last access when available, otherwise upload date.",
    "Recoverable storage is an estimate, not monetary savings.",
    "This report does not archive, compress or delete files."
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `cloudsense-report-${report.generatedAt.slice(0, 10)}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
