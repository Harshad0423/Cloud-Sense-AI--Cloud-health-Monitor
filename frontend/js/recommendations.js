/**
 * recommendations.js
 * Renders the Recommendations page and handles "Take Action" flows.
 */

let allRecommendations = [];

document.addEventListener("DOMContentLoaded", async () => {
  renderShell("recommendations");
  document.getElementById("priorityFilter").addEventListener("change", renderRecommendations);
  await loadRecommendations();
});
async function loadRecommendations() {
  pageState('Loading recommendations…');
  try { allRecommendations=await api.getRecommendations();renderRecommendations();pageState(); }
  catch(error) { console.error(error);pageState('We could not load recommendations.',true,loadRecommendations); }
}

function renderRecommendations() {
  const filter = document.getElementById("priorityFilter").value;
  const grid = document.getElementById("recGrid");
  const emptyState = document.getElementById("recEmptyState");

  const items = filter === "all" ? allRecommendations : allRecommendations.filter((r) => r.priority === filter);

  if (items.length === 0) {
    grid.innerHTML = "";
    emptyState.innerHTML = emptyRecommendationsHTML();
  } else {
    emptyState.innerHTML = "";
    grid.innerHTML = items.map(recCardHTML).join("");
  }

  wireActionButtons();
}

function wireActionButtons() {
  document.querySelectorAll(".rec-action-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleTakeAction(btn.dataset.recId, btn.dataset.action));
  });
}

const pendingRecommendations = new Set();
async function handleTakeAction(recId, actionType) {
  if(pendingRecommendations.has(recId)) return;
  pendingRecommendations.add(recId);
  try {
  const rec = allRecommendations.find((r) => String(r.id) === String(recId));
  if (!rec) return;

  if (actionType === "review-file") {
    window.location.href = `files.html?q=${encodeURIComponent(rec.fileName)}`;
    return;
  }

  if (actionType !== "delete-duplicate") return;

  const confirmed = await confirmDialog({
    title: "Delete duplicate?",
    message: `Permanently delete <strong>${escapeHTML(rec.fileName)}</strong>? This will recover ${escapeHTML(rec.saving)}.`,
    confirmLabel: "Delete duplicate",
    danger: true,
  });
  if (!confirmed) return;

  document.querySelectorAll('.rec-action-btn').forEach(button => {
    if(button.dataset.recId === String(recId)) button.disabled=true;
  });
  try {
    await api.deleteFile(rec.fileId);
    allRecommendations = allRecommendations.filter((r) => String(r.id) !== String(recId));
    renderRecommendations();
    toast(`${escapeHTML(rec.fileName)} deleted successfully`, "success");
  } catch (error) {
    console.error(error);
    toast(`Could not delete ${escapeHTML(rec.fileName)}: ${error.message}`, "error", 6000);
  }
  } finally {
    pendingRecommendations.delete(recId);
    document.querySelectorAll('.rec-action-btn').forEach(button => {
      if(button.dataset.recId === String(recId)) button.disabled=false;
    });
  }
}
