/**
 * website-similarity.js
 * Compares two public sites through the CloudSense Website Similarity Lambda.
 */

document.addEventListener("DOMContentLoaded", () => {
  renderShell("website-similarity");

    loadWebsiteHistory();

  document
    .getElementById("refreshWebsiteHistory")
    .addEventListener("click", loadWebsiteHistory);

    document
    .getElementById("websiteHistoryList")
    .addEventListener("click", handleWebsiteHistoryAction);

  document.getElementById("websiteCompareForm").addEventListener("submit", handleWebsiteComparison);
  document.getElementById("swapWebsitesBtn").addEventListener("click", () => {
    const inputA = document.getElementById("websiteUrlA");
    const inputB = document.getElementById("websiteUrlB");
    [inputA.value, inputB.value] = [inputB.value, inputA.value];
  });
});

async function handleWebsiteComparison(event) {
  event.preventDefault();

  const urlA = document.getElementById("websiteUrlA").value.trim();
  const urlB = document.getElementById("websiteUrlB").value.trim();
  const button = document.getElementById("compareWebsitesBtn");
  const loading = document.getElementById("websiteLoading");
  const results = document.getElementById("websiteResults");

  if (!urlA || !urlB) {
    toast("Enter both website URLs", "error");
    return;
  }

  if(button.disabled) return;
  button.disabled = true;
  pageState();
  button.textContent = "Analyzing…";
  results.classList.add("hidden");
  loading.classList.remove("hidden");

  try {
    const analysis = await api.compareWebsites(urlA, urlB);
    renderWebsiteAnalysis(analysis);
    loadWebsiteHistory();
    results.classList.remove("hidden");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    pageState("The comparison could not be completed. Check the URLs and analyze again.",true);
    toast(error.message || "Website analysis failed", "error", 5000);
  } finally {
    loading.classList.add("hidden");
    button.disabled = false;
    button.textContent = "Analyze similarity";
  }
}

function renderWebsiteAnalysis(analysis) {
  const verdict = analysis.verdict;
  const verdictCard = document.querySelector(".verdict-card");

  verdictCard.dataset.level = verdict.level || "different";
  document.getElementById("verdictLabel").textContent = verdict.label || "Analysis result";
  document.getElementById("verdictTitle").textContent = verdict.title || "Comparison complete";
  document.getElementById("verdictExplanation").textContent = verdict.explanation || "";
  document.getElementById("duplicateScore").textContent = `${Math.round(analysis.scores.duplication || 0)}%`;

  const scoreDefinitions = [
    ["concept", "Concept", "Shared purpose or business category"],
    ["content", "Content", "Matching visible words and phrases"],
    ["code", "Code structure", "Similar HTML structure and class patterns"],
    ["visual", "Design signals", "Similar colours, fonts, and layout markers"],
  ];

  document.getElementById("similarityScoreGrid").innerHTML = scoreDefinitions.map(([key, label, note]) => {
    const value = Math.max(0, Math.min(100, Math.round(analysis.scores[key] || 0)));
    return `
      <article class="card similarity-score-card">
        <div class="similarity-score-head"><span>${escapeWebsiteHTML(label)}</span><strong>${value}%</strong></div>
        <div class="progress-track"><div class="progress-fill" style="width:${value}%"></div></div>
        <p>${escapeWebsiteHTML(note)}</p>
      </article>
    `;
  }).join("");

  renderWebsiteSummary("websiteSummaryA", "Website A", analysis.websites?.a || {});
  renderWebsiteSummary("websiteSummaryB", "Website B", analysis.websites?.b || {});

  const evidence = Array.isArray(analysis.evidence) ? analysis.evidence : [];
  document.getElementById("websiteEvidence").innerHTML = evidence.length
    ? evidence.map((item) => `<li>${escapeWebsiteHTML(item)}</li>`).join("")
    : "<li>No additional evidence was returned.</li>";

  const warnings = Array.isArray(analysis.warnings) ? analysis.warnings : [];
  const warningBox = document.getElementById("websiteWarnings");
  warningBox.classList.toggle("hidden", warnings.length === 0);
  warningBox.innerHTML = warnings.length
    ? `<strong>Analysis notes</strong>${warnings.map((warning) => `<p>${escapeWebsiteHTML(warning)}</p>`).join("")}`
    : "";
}

function renderWebsiteSummary(elementId, heading, website) {
  const title = website.title || website.host || "Untitled website";
  const category = website.category || "Unclassified";
  const finalUrl = website.finalUrl || website.url || "";
  const sampleWords = Number(website.sampleWords || 0).toLocaleString();

  document.getElementById(elementId).innerHTML = `
    <span class="website-summary-label">${escapeWebsiteHTML(heading)}</span>
    <h2>${escapeWebsiteHTML(title)}</h2>
    <a href="${escapeWebsiteAttribute(finalUrl)}" target="_blank" rel="noopener noreferrer">${escapeWebsiteHTML(finalUrl)}</a>
    <div class="website-summary-meta">
      <span><b>Category</b>${escapeWebsiteHTML(category)}</span>
      <span><b>Words analyzed</b>${sampleWords}</span>
    </div>
  `;
}

function escapeWebsiteHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeWebsiteAttribute(value) {
  const text = String(value ?? "");
  return /^https?:\/\//i.test(text) ? escapeWebsiteHTML(text) : "#";
}
async function loadWebsiteHistory() {
  const loading = document.getElementById("websiteHistoryLoading");
  const empty = document.getElementById("websiteHistoryEmpty");
  const list = document.getElementById("websiteHistoryList");
  const refreshButton = document.getElementById("refreshWebsiteHistory");

  if(refreshButton.disabled) return;
  loading.textContent="Loading recent comparisons…";
  loading.classList.remove("hidden");
  empty.classList.add("hidden");
  list.innerHTML = "";
  refreshButton.disabled = true;

  try {
    const scans = await api.getWebsiteScans();
    renderWebsiteHistory(scans);
  } catch (error) {
    console.error(error);
    loading.textContent = "Unable to load recent comparisons.";
    toast(error.message || "Could not load comparison history", "error");
    return;
  } finally {
    refreshButton.disabled = false;
  }

  loading.classList.add("hidden");
}


function renderWebsiteHistory(scans) {
  const loading = document.getElementById("websiteHistoryLoading");
  const empty = document.getElementById("websiteHistoryEmpty");
  const list = document.getElementById("websiteHistoryList");

  loading.classList.add("hidden");

  if (!Array.isArray(scans) || scans.length === 0) {
    empty.classList.remove("hidden");
    list.innerHTML = "";
    return;
  }

  empty.classList.add("hidden");

  list.innerHTML = scans.map((scan) => {
    const score = Math.round(Number(scan.duplicationScore || 0));
    const level = scan.verdictLevel || "different";
    const label = scan.verdictLabel || "Analysis complete";

    const date = scan.analyzedAt
      ? new Date(scan.analyzedAt).toLocaleString()
      : "Date unavailable";

    return `
      <article class="website-history-item">
        <div class="website-history-head">
          <div>
            <span
              class="website-history-verdict"
              data-level="${escapeWebsiteHTML(level)}"
            >
              ${escapeWebsiteHTML(label)}
            </span>
          </div>

          <div class="website-history-score">
            ${score}%
            <small>Duplication</small>
          </div>
        </div>

        <div class="website-history-sites">
          <div class="website-history-site">
            <strong>${escapeWebsiteHTML(scan.titleA || "Website A")}</strong>
            <a
              href="${escapeWebsiteAttribute(scan.urlA)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              ${escapeWebsiteHTML(scan.urlA || "URL unavailable")}
            </a>
          </div>

          <div class="website-history-site">
            <strong>${escapeWebsiteHTML(scan.titleB || "Website B")}</strong>
            <a
              href="${escapeWebsiteAttribute(scan.urlB)}"
              target="_blank"
              rel="noopener noreferrer"
            >
              ${escapeWebsiteHTML(scan.urlB || "URL unavailable")}
            </a>
          </div>
        </div>

        <p class="website-history-date">
          Analyzed ${escapeWebsiteHTML(date)}
        </p>

        <div class="website-history-actions">
          <button
            class="btn btn-primary"
            type="button"
            data-compare-again
            data-url-a="${escapeWebsiteAttribute(scan.urlA)}"
            data-url-b="${escapeWebsiteAttribute(scan.urlB)}"
          >
            Compare again
          </button>

          <button
            class="btn btn-ghost"
            type="button"
            data-delete-scan="${escapeWebsiteHTML(scan.scanId || "")}"
          >
            Delete
          </button>
        </div>
      </article>
    `;
  }).join("");
}

async function handleWebsiteHistoryAction(event) {

    const compareButton = event.target.closest("[data-compare-again]");

    if (compareButton) {
      document.getElementById("websiteUrlA").value =
        compareButton.dataset.urlA || "";

      document.getElementById("websiteUrlB").value =
        compareButton.dataset.urlB || "";

      document
        .getElementById("websiteCompareForm")
        .scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

      document.getElementById("websiteUrlA").focus();
      toast("Previous website URLs loaded", "success");
      return;
    }

  const deleteButton = event.target.closest("[data-delete-scan]");

  if (!deleteButton) {
    return;
  }

  const scanId = deleteButton.dataset.deleteScan;

  if (!scanId) {
    toast("This comparison has no scan ID", "error");
    return;
  }

  if(deleteButton.disabled) return;
  deleteButton.disabled=true;
  const confirmed = await confirmDialog({ title: "Delete comparison?", message: "Delete this saved website comparison?", confirmLabel: "Delete comparison", danger: true });

  if (!confirmed) {
    deleteButton.disabled=false;
    return;
  }

  deleteButton.disabled = true;
  deleteButton.textContent = "Deleting…";

  try {
    await api.deleteWebsiteScan(scanId);
    toast("Website comparison deleted", "success");
    await loadWebsiteHistory();
  } catch (error) {
    console.error(error);
    toast(error.message || "Could not delete comparison", "error");
    deleteButton.disabled = false;
    deleteButton.textContent = "Delete";
  }
}