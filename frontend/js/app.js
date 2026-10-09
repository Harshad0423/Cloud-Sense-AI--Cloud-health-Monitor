/**
 * app.js
 * ------------------------------------------------------------------
 * Shared "shell" logic used by every page:
 *   - sidebar / topbar markup injection
 *   - mobile navigation toggle
 *   - notification dropdown
 *   - toast messages
 *   - a tiny generic modal system
 *   - the future-facing "API layer" (see bottom of file)
 *
 * Every page includes this file BEFORE its own page script
 * (dashboard.js / files.js / etc.) because those scripts call
 * helpers defined here (toast, openModal, api.*).
 * ------------------------------------------------------------------
 */

const NAV_ITEMS = [
  { page: "dashboard",       label: "Dashboard",      href: "dashboard.html",       icon: "cloud" },
  { page: "files",           label: "Files",          href: "files.html",           icon: "folder" },
  { page: "website-similarity", label: "Website Check", href: "website-similarity.html", icon: "globe" },
  { page: "recommendations", label: "Recommendations",href: "recommendations.html", icon: "bulb" },
  { page: "analytics",       label: "Analytics",      href: "analytics.html",       icon: "chart" },
  { page: "reports",         label: "Reports",        href: "reports.html",         icon: "mail" },
  { page: "settings",        label: "Settings",       href: "settings.html",        icon: "gear" },
];

const ICONS = {
  cloud:  '<svg viewBox="0 0 24 24" fill="none"><path d="M7 18a4.5 4.5 0 0 1-.4-8.98A5.5 5.5 0 0 1 17.2 8.1 4 4 0 0 1 17 18H7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none"><path d="M3.5 6.5a1 1 0 0 1 1-1h4.6l1.6 2h8.3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-14.5a1 1 0 0 1-1-1v-11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  globe:  '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12S9.7 18.5 12 21" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  bulb:   '<svg viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  chart:  '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mail:   '<svg viewBox="0 0 24 24" fill="none"><path d="M3.5 6.5h17v11h-17v-11Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  gear:   '<svg viewBox="0 0 24 24" fill="none"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" stroke-width="1.6"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.9-1.4-1.5-2.6-2.2.7a7.7 7.7 0 0 0-2.6-1.5L14.6 3h-3l-.4 2.3a7.7 7.7 0 0 0-2.6 1.5l-2.2-.7-1.5 2.6L6.6 10a7.6 7.6 0 0 0 0 3l-1.9 1.4 1.5 2.6 2.2-.7c.75.66 1.63 1.17 2.6 1.5l.4 2.3h3l.4-2.3a7.7 7.7 0 0 0 2.6-1.5l2.2.7 1.5-2.6-1.9-1.4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  bell:   '<svg viewBox="0 0 24 24" fill="none"><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.5 17.5a2.5 2.5 0 0 0 5 0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="m20 20-4.3-4.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  menu:   '<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  close:  '<svg viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

/* ------------------------------------------------------------------
   SHELL RENDERING (sidebar + topbar)
------------------------------------------------------------------ */
function renderShell(activePage) {
  const sidebarRoot = document.getElementById("sidebar-root");
  const topbarRoot = document.getElementById("topbar-root");
  if (sidebarRoot) sidebarRoot.innerHTML = buildSidebar(activePage);
  if (topbarRoot) topbarRoot.innerHTML = buildTopbar();

  wireMobileNav();
  wireNotifications();
  wireGlobalSearch();
  initializeUI(activePage);
}

function buildSidebar(activePage) {
  return `<nav class="sidebar-nav" aria-label="Quick navigation">${NAV_ITEMS.map(item =>
    `<a href="${item.href}" class="nav-link ${item.page === activePage ? 'active' : ''}" title="${item.label}" aria-label="${item.label}" ${item.page === activePage ? 'aria-current="page"' : ''}><span class="nav-icon">${ICONS[item.icon]}</span></a>`
  ).join('')}</nav>`;
}

function buildTopbar() {
  const active = location.pathname.split('/').pop();
  return `<a class="shell-brand" href="dashboard.html"><span class="brand-mark">${ICONS.cloud}</span><span class="brand-name">CloudSense <em>AI</em></span></a>
    <nav class="top-tabs" aria-label="Main navigation">${NAV_ITEMS.map(item => `<a href="${item.href}" class="${active === item.href ? 'active' : ''}" ${active === item.href ? 'aria-current="page"' : ''}>${item.page === 'dashboard' ? 'Overview' : item.label}</a>`).join('')}</nav>
    <div class="topbar-actions"><button id="themeToggle" class="theme-toggle" type="button">Light mode</button><button id="openSearchBtn" class="icon-btn" aria-label="Search files">${ICONS.search}</button></div>`;
}

function wireMobileNav() {
  const toggle = document.getElementById("mobileNavToggle");
  const sidebar = document.querySelector(".sidebar");
  if (!toggle || !sidebar) return;

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    document.body.classList.toggle("nav-open");
  });

  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target) &&
      e.target !== toggle &&
      !toggle.contains(e.target)
    ) {
      sidebar.classList.remove("open");
      document.body.classList.remove("nav-open");
    }
  });
}

function wireNotifications() {
  const btn = document.getElementById("notifBtn");
  const dropdown = document.getElementById("notifDropdown");
  if (!btn || !dropdown) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
  });
  document.addEventListener("click", () => dropdown.classList.add("hidden"));
}

function wireGlobalSearch() {
  const input = document.getElementById("globalSearchInput");
  if (!input) return;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && input.value.trim()) {
      // Files page reads ?q= to pre-filter its own search box.
      window.location.href = `files.html?q=${encodeURIComponent(input.value.trim())}`;
    }
  });
}

/* ------------------------------------------------------------------
   TOASTS
------------------------------------------------------------------ */
function ensureToastContainer() {
  let el = document.getElementById("toast-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast-container";
    document.body.appendChild(el);
  }
  return el;
}

function toast(message, type = "success", duration = 3200) {
  const container = ensureToastContainer();
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-dot"></span><span></span>`;
  el.lastElementChild.textContent = message;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  container.appendChild(el);

  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, duration);
}

/* ------------------------------------------------------------------
   GENERIC MODAL SYSTEM
------------------------------------------------------------------ */
function ensureModalRoot() {
  let el = document.getElementById("modal-root");
  if (!el) {
    el = document.createElement("div");
    el.id = "modal-root";
    document.body.appendChild(el);
  }
  return el;
}

let activeModalClose = null;
function openModal(innerHTML, { onClose, drawer = false } = {}) {
  if (activeModalClose) activeModalClose();
  const previousFocus = document.activeElement;
  const root = ensureModalRoot();
  root.innerHTML = `<div class="modal-overlay ${drawer ? 'drawer-overlay' : ''}"><div class="modal-box ${drawer ? 'drawer-box' : ''}" role="dialog" aria-modal="true" aria-labelledby="activeModalTitle" tabindex="-1"><button class="modal-close" aria-label="Close">${ICONS.close}</button>${innerHTML}</div></div>`;
  const box = root.querySelector('.modal-box');
  const title = box.querySelector('h2,h3');
  if (title) title.id = 'activeModalTitle';
  else box.setAttribute('aria-label','CloudSense dialog');
  root.classList.add('visible');
  const overflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const siblings = [...document.body.children].filter(el => el !== root && !['SCRIPT','LINK'].includes(el.tagName));
  const inertState = siblings.map(el => el.inert);
  siblings.forEach(el => el.inert = true);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', keyboard);
    root.classList.remove('visible'); root.innerHTML = '';
    document.body.style.overflow = overflow;
    siblings.forEach((el,i) => el.inert = inertState[i]);
    activeModalClose = null;
    previousFocus?.focus();
    onClose?.();
  };
  function keyboard(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') {
      const items = [...box.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length);
      const first=items[0], last=items[items.length-1];
      if (!first) { e.preventDefault(); box.focus(); }
      else if (e.shiftKey && (document.activeElement===first || document.activeElement===box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); }
    }
  }
  root.querySelector('.modal-close').onclick = close;
  root.querySelector('.modal-overlay').onclick = e => { if(e.target===e.currentTarget) close(); };
  document.addEventListener('keydown',keyboard);
  activeModalClose = close;
  box.querySelector('input,button')?.focus();
  return { close };
}

function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    let settled = false;
    const modal = openModal(`
      <h3 class="modal-title">${title}</h3>
      <p class="modal-message">${message}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modalCancelBtn">Cancel</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="modalConfirmBtn">${confirmLabel}</button>
      </div>
    `, {
      onClose: () => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      },
    });

    const finish = (result) => {
      if (settled) return;
      settled = true;
      modal.close();
      resolve(result);
    };

    document.getElementById("modalCancelBtn").addEventListener("click", () => {
      finish(false);
    });
    document.getElementById("modalConfirmBtn").addEventListener("click", () => {
      finish(true);
    });
  });
}

/* ------------------------------------------------------------------
   SMALL UTILITIES
------------------------------------------------------------------ */
function formatSize(sizeMB) {
  if (sizeMB >= 1024) return (sizeMB / 1024).toFixed(1) + " GB";
  if (sizeMB * 1024 < 1) return Math.round(sizeMB * 1024 * 1024) + " B";
  if (sizeMB < 1) return Math.round(sizeMB * 1024) + " KB";
  return sizeMB.toFixed(sizeMB < 10 ? 1 : 0) + " MB";
}

function debounce(fn, wait = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function statusClass(status) {
  return {
    Healthy: "status-healthy",
    Duplicate: "status-duplicate",
    Inactive: "status-inactive",
    Large: "status-large",
  }[status] || "";
}

/* ------------------------------------------------------------------
   SHARED RECOMMENDATION CARD (used by dashboard.js + recommendations.js)
------------------------------------------------------------------ */
function recCardHTML(rec) {
  return `
    <div class="card rec-card" data-rec-id="${escapeHTML(rec.id)}">
      <span class="rec-priority ${escapeHTML(rec.priority)}"><span class="dot"></span>${escapeHTML(rec.priorityLabel)}</span>
      <div>
        <div class="rec-file">${escapeHTML(rec.fileName)}</div>
        <div class="rec-problem">${escapeHTML(rec.problem)}</div>
      </div>
      <div class="rec-body">
        <div class="rlabel">Recommendation</div>
        <div class="rtext">${escapeHTML(rec.recommendation)}</div>
      </div>
      <div class="rec-saving">${escapeHTML(rec.savingLabel)}: <strong>${escapeHTML(rec.saving)}</strong></div>
      <button class="btn btn-primary btn-block rec-action-btn" data-action="${escapeHTML(rec.actionType)}" data-rec-id="${escapeHTML(rec.id)}" ${['review-file','delete-duplicate'].includes(rec.actionType) ? '' : 'disabled'}>
        ${['review-file','delete-duplicate'].includes(rec.actionType) ? escapeHTML(rec.actionLabel) : 'Action unavailable'}
      </button>
    </div>
  `;
}

function emptyRecommendationsHTML() {
  return `
    <div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-icon">${ICONS.cloud}</div>
      <h3>No recommendations yet</h3>
      <p>No optimization opportunities match this view. Check again after your next storage analysis.</p>
    </div>
  `;
}

/* ------------------------------------------------------------------
   AWS API LAYER
   ------------------------------------------------------------------
   FILES:    Frontend  →  API Gateway  →  Lambda  →  DynamoDB
   UPLOADS:  Frontend  →  API Gateway  →  Lambda  →  S3
   SETTINGS: Frontend  →  API Gateway  →  Lambda  →  DynamoDB

   Page scripts use these existing AWS request contracts. Preserve routes,
   headers, request bodies and response parsing when changing presentation.
------------------------------------------------------------------ */
const api = {
  async getFiles() {
    const response = await fetch("https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/files", {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Could not load files (HTTP ${response.status})`);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.files)) {
      throw new Error("The file service returned an unexpected response");
    }

    return payload.files.map((file) => {
      const fileName = file.fileName || "Unnamed file";
      const extension = fileName.includes(".")
        ? fileName.split(".").pop().toUpperCase()
        : "FILE";
      const uploadedDate = file.uploadedAt ? new Date(file.uploadedAt) : null;

      return {
        id: String(file.fileId || file.fileKey || fileName),
        name: fileName,
        fileKey: file.fileKey || "",
        sizeMB: Number(file.fileSize || 0) / (1024 * 1024),
        type: extension,
        uploadedAt: file.uploadedAt || null,
        uploaded: uploadedDate && !Number.isNaN(uploadedDate.getTime())
          ? uploadedDate.toLocaleString()
          : "Unknown",
        lastAccessed: "Not tracked",
        status: file.status || "Healthy",
        duplicateOf: file.duplicateOf ? String(file.duplicateOf) : null,
      };
    });
  },

  async uploadFile(file, onProgress = () => {}) {
    const uploadApiUrl = "https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/upload-url";
    const contentType = file.type || "application/octet-stream";

    const urlResponse = await fetch(uploadApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType,
      }),
    });

    if (!urlResponse.ok) {
      throw new Error(`Could not prepare upload (HTTP ${urlResponse.status})`);
    }

    const uploadDetails = await urlResponse.json();
    if (!uploadDetails.uploadUrl) {
      throw new Error("The upload service did not return an upload URL");
    }

    await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", uploadDetails.uploadUrl);
      request.setRequestHeader("Content-Type", contentType);

      request.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      request.addEventListener("load", () => {
        if (request.status >= 200 && request.status < 300) {
          onProgress(100);
          resolve();
        } else {
          reject(new Error(`S3 rejected the upload (HTTP ${request.status})`));
        }
      });
      request.addEventListener("error", () => reject(new Error("Network error while uploading to S3")));
      request.addEventListener("abort", () => reject(new Error("Upload cancelled")));
      request.send(file);
    });

    return {
      id: Date.now() + Math.floor(Math.random() * 1000),
      fileKey: uploadDetails.fileKey,
      name: file.name,
      sizeMB: file.size / (1024 * 1024),
    };
  },

  async deleteFile(fileId) {
    const deleteUrl = `https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/files/${encodeURIComponent(fileId)}`;
    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: { "Accept": "application/json" },
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      // Preserve the useful HTTP error below if the response has no JSON body.
    }

    if (!response.ok) {
      throw new Error(payload.message || `Could not delete file (HTTP ${response.status})`);
    }

    return payload;
  },

  async getHealthScore() {
    const dashboard = await this.getDashboardStats();
    return dashboard.health;
  },

  async getRecommendations() {
    const response = await fetch("https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/recommendations", {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Could not load recommendations (HTTP ${response.status})`);
    }

    const payload = await response.json();
    if (!payload || !Array.isArray(payload.recommendations)) {
      throw new Error("The recommendations service returned an unexpected response");
    }

    const priorityLabels = {
      high: "HIGH PRIORITY",
      medium: "OPTIMIZATION",
      low: "STORAGE OPTIMIZATION",
    };

    return payload.recommendations.map((recommendation) => {
      const priority = String(recommendation.priority || "Low").toLowerCase();

      return {
        ...recommendation,
        id: String(recommendation.id),
        priority,
        priorityLabel: priorityLabels[priority] || "RECOMMENDATION",
        problem: recommendation.description || recommendation.title || "Storage recommendation",
      };
    });
  },

  async getStorageStats() {
    const dashboard = await this.getDashboardStats();
    return dashboard.storage;
  },

  async getDashboardStats() {
    const response = await fetch("https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/dashboard-stats", {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Could not load dashboard statistics (HTTP ${response.status})`);
    }

    const payload = await response.json();
    if (!payload?.health || !payload?.storage || !payload?.summary) {
      throw new Error("The dashboard statistics service returned an unexpected response");
    }

    return payload;
  },

  async getNotifications() {
    throw new Error("Notifications are unavailable: no notification API is configured.");
  },

  async getSettings() {
    const response = await fetch("https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/settings", {
      method: "GET",
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Could not load settings (HTTP ${response.status})`);
    }

    const payload = await response.json();
    if (!payload?.settings) {
      throw new Error("The settings service returned an unexpected response");
    }

    const settings = payload.settings;
    return {
      account: {
        name: settings.name || "",
        email: settings.email || "",
      },
      analysisFrequency: settings.analysisFrequency || "weekly",
      notifications: {
        emailReports: Boolean(settings.emailReports),
        duplicateAlerts: Boolean(settings.duplicateAlerts),
        storageWarnings: Boolean(settings.storageWarnings),
      },
    };
  },

  async saveSettings(settings) {
    const response = await fetch("https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/settings", {
      method: "PUT",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: settings.account.name,
        email: settings.account.email,
        analysisFrequency: settings.analysisFrequency,
        emailReports: settings.notifications.emailReports,
        duplicateAlerts: settings.notifications.duplicateAlerts,
        storageWarnings: settings.notifications.storageWarnings,
      }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      // Preserve the useful HTTP error below if the response has no JSON body.
    }

    if (!response.ok) {
      throw new Error(payload.message || `Could not save settings (HTTP ${response.status})`);
    }

    return payload;
  },

  async getWebsiteScans() {
    const response = await fetch(
      "https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/website-similarity",
      {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      }
    );

    let payload = {};

    try {
      payload = await response.json();
    } catch (error) {
      // The HTTP error below will provide the useful message.
    }

    if (!response.ok) {
      throw new Error(
        payload.message ||
        `Could not load website scan history (HTTP ${response.status})`
      );
    }

    return Array.isArray(payload.scans) ? payload.scans : [];
  },

async deleteWebsiteScan(scanId) {
  const response = await fetch(
    `https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/website-similarity/${encodeURIComponent(scanId)}`,
    {
      method: "DELETE",
      headers: {
        "Accept": "application/json"
      }
    }
  );

  let payload = {};

  try {
    payload = await response.json();
  } catch (error) {
    // Preserve the useful HTTP error below.
  }

  if (!response.ok) {
    throw new Error(
      payload.message ||
      `Could not delete website scan (HTTP ${response.status})`
    );
  }

  return payload;
},

  async compareWebsites(urlA, urlB) {
    const response = await fetch("https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com/website-similarity", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urlA, urlB }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      // Preserve the HTTP status in the error below when the body is not JSON.
    }

    if (!response.ok) {
      throw new Error(payload.message || `Could not compare websites (HTTP ${response.status})`);
    }

    if (!payload?.scores || !payload?.verdict) {
      throw new Error("The website comparison service returned an unexpected response");
    }

    return payload;
  },

  async generateReport() {
    throw new Error("Server report generation is unavailable. Use the live report download.");
  },
};
