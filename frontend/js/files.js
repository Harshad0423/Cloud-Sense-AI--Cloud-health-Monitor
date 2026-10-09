/**
 * files.js
 * Handles the Files page: table rendering, search, filters, sorting,
 * pagination, real AWS S3 uploads, and duplicate/delete actions.
 */

let allFiles = [];
let filteredFiles = [];
let currentPage = 1;
const PAGE_SIZE = 6;

document.addEventListener("DOMContentLoaded", async () => {
  renderShell("files");
  // Pre-fill search box if the person arrived via the global search bar.
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  if (q) document.getElementById("fileSearchInput").value = q;

  wireToolbar();
  wireUploadZone();
  if(params.get("upload") === "1") document.getElementById("openUploadBtn").click();
  await loadFiles();
});

async function loadFiles() {
  pageState('Loading files from AWS…');
  try {
    allFiles = await api.getFiles();
    const select=document.getElementById('typeFilter'), current=select.value;
    select.innerHTML='<option value="all">All types</option>'+[...new Set(allFiles.map(f=>f.type))].sort().map(type=>`<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join('');
    if([...select.options].some(o=>o.value===current)) select.value=current;
    applyFiltersAndRender(); pageState();
  } catch(error) { console.error(error);pageState('We could not load your files. Please try again.',true,loadFiles); }
}

/* ------------------------------------------------------------------
   FILTER / SORT / SEARCH
------------------------------------------------------------------ */
function wireToolbar() {
  document.getElementById("fileSearchInput").addEventListener("input", debounce(applyFiltersAndRender, 150));
  document.getElementById("typeFilter").addEventListener("change", applyFiltersAndRender);
  document.getElementById("statusFilter").addEventListener("change", applyFiltersAndRender);
  document.getElementById("sortSelect").addEventListener("change", applyFiltersAndRender);

  document.getElementById("openUploadBtn").addEventListener("click", () => {
    document.getElementById("uploadSection").style.display = "block";
    document.getElementById("uploadSection").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  document.getElementById("closeUploadBtn").addEventListener("click", () => {
    document.getElementById("uploadSection").style.display = "none";
  });

  // Sortable column headers
  document.querySelectorAll("table.data-table th").forEach((th, idx) => {
    if(idx > 1) return;
    th.tabIndex=0;
    th.setAttribute("aria-label", `Sort by ${th.textContent}`);
    th.addEventListener("keydown", e=>{if(e.key==="Enter" || e.key===" "){e.preventDefault();th.click();}});
    th.addEventListener("click", () => {
      if (idx === 1) document.getElementById("sortSelect").value =
        document.getElementById("sortSelect").value === "size-desc" ? "size-asc" : "size-desc";
      if (idx === 0) document.getElementById("sortSelect").value = "name-asc";
      applyFiltersAndRender();
    });
  });
}

function applyFiltersAndRender() {
  const query = document.getElementById("fileSearchInput").value.trim().toLowerCase();
  const typeFilter = document.getElementById("typeFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;
  const sort = document.getElementById("sortSelect").value;

  filteredFiles = allFiles.filter((f) => {
    const matchesQuery = !query || f.name.toLowerCase().includes(query) || f.status.toLowerCase().includes(query);
    const matchesType = typeFilter === "all" || f.type === typeFilter;
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesQuery && matchesType && matchesStatus;
  });

  filteredFiles.sort((a, b) => {
    if (sort === "name-asc") return a.name.localeCompare(b.name);
    if (sort === "size-desc") return b.sizeMB - a.sizeMB;
    if (sort === "size-asc") return a.sizeMB - b.sizeMB;
    return 0;
  });

  currentPage = 1;
  renderTable();
}

/* ------------------------------------------------------------------
   TABLE + PAGINATION
------------------------------------------------------------------ */
function renderTable() {
  const tbody = document.getElementById("filesTableBody");
  const emptyState = document.getElementById("filesEmptyState");
  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const pageItems = filteredFiles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (filteredFiles.length === 0) {
    tbody.innerHTML = "";
    emptyState.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${ICONS.folder}</div>
        <h3>${allFiles.length ? "No files match your search" : "Your storage is empty"}</h3>
        <p>${allFiles.length ? "Try another keyword or clear your filters." : "Upload your first file to get started."}</p>
      </div>`;
  } else {
    emptyState.innerHTML = "";
    tbody.innerHTML = pageItems.map(fileRowHTML).join("");
  }

  renderPagination(totalPages);
  wireRowActions();
}

function fileRowHTML(file) {
  const typeColors = { PDF: "#2F6FED", DOCX: "#17B8A6", ZIP: "#8A5CF6", MP4: "#E5484D", JPG: "#F5A623" };
  return `
    <tr data-file-id="${escapeHTML(file.id)}">
      <td>
        <div class="file-name-cell">
          <span class="file-type-dot" style="background:${typeColors[file.type] || "#8A93A6"}"></span>
          ${escapeHTML(file.name)}
        </div>
      </td>
      <td class="mono">${formatSize(file.sizeMB)}</td>
      <td>${escapeHTML(file.type)}</td>
      <td>${escapeHTML(file.uploaded)}</td>
      <td>${escapeHTML(file.lastAccessed)}</td>
      <td><span class="status-pill ${statusClass(file.status)}">${escapeHTML(file.status)}</span></td>
      <td>
        <div class="row-actions">
          ${file.status === "Duplicate" ? `<button data-action="view-duplicate" data-file-id="${escapeHTML(file.id)}">Review</button>` : ""}
          <button class="danger" data-action="delete" data-file-id="${escapeHTML(file.id)}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

function renderPagination(totalPages) {
  const el = document.getElementById("pagination");
  if (filteredFiles.length === 0) { el.innerHTML = ""; return; }

  let btns = "";
  for (let i = 1; i <= totalPages; i++) {
    btns += `<button class="${i === currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
  }

  el.innerHTML = `
    <span>Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredFiles.length)} of ${filteredFiles.length} files</span>
    <div class="pagination-btns">
      <button data-page="${currentPage - 1}" ${currentPage === 1 ? "disabled" : ""}>‹</button>
      ${btns}
      <button data-page="${currentPage + 1}" ${currentPage === totalPages ? "disabled" : ""}>›</button>
    </div>
  `;

  el.querySelectorAll("button[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = Number(btn.dataset.page);
      if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
      }
    });
  });
}

/* ------------------------------------------------------------------
   ROW ACTIONS (delete / review duplicate)
------------------------------------------------------------------ */
function wireRowActions() {
  document.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.fileId));
  });
  document.querySelectorAll('button[data-action="view-duplicate"]').forEach((btn) => {
    btn.addEventListener("click", () => handleViewDuplicate(btn.dataset.fileId));
  });
}

const deletingFiles = new Set();
async function handleDelete(fileId) {
  if(deletingFiles.has(fileId)) return;
  deletingFiles.add(fileId);
  try {
  const file = allFiles.find((f) => String(f.id) === String(fileId));
  if (!file) return;

  const confirmed = await confirmDialog({
    title: "Delete file?",
    message: `Permanently delete <strong>${escapeHTML(file.name)}</strong> from storage?`,
    confirmLabel: "Delete",
    danger: true,
  });
  if (!confirmed) return;

  setFileBusy(fileId, true);
  try {
    await api.deleteFile(fileId);
    allFiles = allFiles.filter((f) => String(f.id) !== String(fileId));
    applyFiltersAndRender();
    toast(`${escapeHTML(file.name)} deleted successfully`, "success");
  } catch (error) {
    console.error(error);
    toast(`Could not delete ${escapeHTML(file.name)}: ${error.message}`, "error", 6000);
  }
  } finally { deletingFiles.delete(fileId); setFileBusy(fileId, false); }
}

function setFileBusy(fileId, busy) {
  document.querySelectorAll('button[data-file-id]').forEach(button => {
    if(button.dataset.fileId === String(fileId)) button.disabled=busy;
  });
}

function handleViewDuplicate(fileId) {
  if(deletingFiles.has(fileId)) return;
  const duplicate = allFiles.find((f) => String(f.id) === String(fileId));
  const original = allFiles.find((f) => String(f.id) === String(duplicate?.duplicateOf));
  if (!duplicate) return;

  const modal = openModal(`
    <h3 class="modal-title">⚠ Duplicate File Detected</h3>
    <p class="modal-message">
      <strong>${escapeHTML(duplicate.name)}</strong> appears to be identical to
      ${original ? `<strong>${escapeHTML(original.name)}</strong>` : "another file in your storage"}.
    </p>
    <div class="duplicate-compare">
      <div class="dc-box">
        <div class="dc-label">Original File</div>
        <div class="dc-name">${original ? escapeHTML(original.name) : "—"}</div>
      </div>
      <div class="dc-box">
        <div class="dc-label">Duplicate</div>
        <div class="dc-name">${escapeHTML(duplicate.name)}</div>
      </div>
    </div>
    <p class="modal-message">Potential space saved: <strong>${formatSize(duplicate.sizeMB)}</strong></p>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="keepFileBtn">Keep File</button>
      <button class="btn btn-danger" id="deleteDupBtn">Delete Duplicate</button>
    </div>
  `);

  document.getElementById("keepFileBtn").addEventListener("click", () => {
    modal.close();
    toast(`Kept ${escapeHTML(duplicate.name)}`, "info");
  });
  document.getElementById("deleteDupBtn").addEventListener("click", async () => {
    if(deletingFiles.has(fileId)) return;
    deletingFiles.add(fileId);
    setFileBusy(fileId, true);
    modal.close();
    try {
      await api.deleteFile(fileId);
      allFiles = allFiles.filter((f) => String(f.id) !== String(fileId));
      applyFiltersAndRender();
      toast(`${escapeHTML(duplicate.name)} deleted — ${formatSize(duplicate.sizeMB)} freed`, "success");
    } catch (error) {
      console.error(error);
      toast(`Could not delete ${escapeHTML(duplicate.name)}: ${error.message}`, "error", 6000);
    } finally {
      deletingFiles.delete(fileId);
      setFileBusy(fileId, false);
    }
  });
}

/* ------------------------------------------------------------------
   UPLOAD ZONE (presigned AWS S3 upload)
------------------------------------------------------------------ */
function wireUploadZone() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const chooseBtn = document.getElementById("chooseFilesBtn");

  chooseBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleFilesSelected(e.target.files));

  ["dragenter", "dragover"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
    })
  );
  dropZone.addEventListener("drop", (e) => handleFilesSelected(e.dataTransfer.files));
}

const uploadingFiles = new Set();
function handleFilesSelected(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const list = document.getElementById("uploadProgressList");

  files.forEach((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if(uploadingFiles.has(key)) return;
    uploadingFiles.add(key);
    const rowId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const sizeLabel = file.size >= 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(1) + " MB"
      : Math.round(file.size / 1024) + " KB";

    const row = document.createElement("div");
    row.className = "upload-progress-item";
    row.id = rowId;
    row.innerHTML = `
      <div class="upload-progress-top">
        <span class="fname">${escapeHTML(file.name)}</span>
        <span class="fsize">${sizeLabel}</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:0%"></div></div>
      <div class="upload-progress-status">Uploading…</div>
    `;
    list.prepend(row);

    uploadToS3(row, file).finally(() => { uploadingFiles.delete(key); document.getElementById("fileInput").value=""; });
  });
}

async function uploadToS3(row, file) {
  const fill = row.querySelector(".progress-fill");
  const status = row.querySelector(".upload-progress-status");
  status.textContent = "Preparing secure upload…";

  try {
    const uploaded = await api.uploadFile(file, (progress) => {
      fill.style.width = `${progress}%`;
      status.textContent = `Uploading… ${progress}%`;
    });

    fill.style.width = "100%";
    status.textContent = "✓ Uploaded securely to Amazon S3";
    status.classList.add("done");

    // The S3 trigger writes metadata to DynamoDB asynchronously. Give it a
    // moment, then reload the table from the real GET /files endpoint.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    try {
      allFiles = await api.getFiles();
    } catch (refreshError) {
      allFiles.unshift({
        id: uploaded.fileKey || String(Date.now()),
        name: uploaded.name,
        sizeMB: uploaded.sizeMB,
        type: (file.name.split(".").pop() || "FILE").toUpperCase(),
        uploaded: "Just now",
        lastAccessed: "Not tracked",
        status: "Processing",
      });
    }
    applyFiltersAndRender();
    toast(`${escapeHTML(file.name)} uploaded to S3 successfully`, "success");
  } catch (error) {
    fill.style.width = "0%";
    status.textContent = `Upload failed: ${error.message}`;
    status.classList.add("error");
    toast(`${escapeHTML(file.name)} could not be uploaded`, "error", 5000);
  }
}
