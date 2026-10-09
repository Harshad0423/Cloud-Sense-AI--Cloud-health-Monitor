/**
 * settings.js
 * Loads and saves settings through the CloudSense AWS API.
 */

document.addEventListener("DOMContentLoaded", async () => {
  renderShell("settings");
  wireFrequencyGroup();
  document.getElementById("saveSettingsBtn").addEventListener("click", handleSave);

  await loadSettings();
});
async function loadSettings() {
  setSettingsDisabled(true); pageState('Loading saved preferences…');
  try { const settings=await api.getSettings();populateForm(settings);updateShellUser(settings.account.name);pageState();setSettingsDisabled(false); }
  catch(error) { console.error(error);pageState('Your preferences could not be loaded. Retry before editing.',true,loadSettings); }
}
function setSettingsDisabled(disabled) { document.querySelectorAll('main input, #saveSettingsBtn').forEach(el=>el.disabled=disabled); }

function updateShellUser(name) {
  const safeName = name || "CloudSense User";
  const nameElement = document.querySelector(".user-name");
  const avatarElement = document.querySelector(".avatar");

  if (nameElement) nameElement.textContent = safeName;
  if (avatarElement) {
    avatarElement.textContent = safeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "CU";
  }
}

function populateForm(settings) {
  document.getElementById("accountName").value = settings.account.name;
  document.getElementById("accountEmail").value = settings.account.email;

  document.querySelectorAll(".radio-option").forEach((el) => {
    el.classList.toggle("selected", el.dataset.value === settings.analysisFrequency);
    el.querySelector("input").checked = el.dataset.value === settings.analysisFrequency;
  });

  document.getElementById("notifEmailReports").checked = settings.notifications.emailReports;
  document.getElementById("notifDuplicateAlerts").checked = settings.notifications.duplicateAlerts;
  document.getElementById("notifStorageWarnings").checked = settings.notifications.storageWarnings;
}

function wireFrequencyGroup() {
  document.querySelectorAll('input[name="frequency"]').forEach(input=>input.addEventListener('change',()=>{
    document.querySelectorAll('.radio-option').forEach(label=>label.classList.toggle('selected',label.querySelector('input').checked));
  }));
}
async function handleSave() {
  if(document.getElementById("saveSettingsBtn").disabled) return;
  if(!document.getElementById("accountEmail").reportValidity()) return;
  const selectedFrequency = document.querySelector(".radio-option.selected")?.dataset.value || "weekly";

  const updatedSettings = {
    account: {
      name: document.getElementById("accountName").value.trim(),
      email: document.getElementById("accountEmail").value.trim(),
    },
    analysisFrequency: selectedFrequency,
    notifications: {
      emailReports: document.getElementById("notifEmailReports").checked,
      duplicateAlerts: document.getElementById("notifDuplicateAlerts").checked,
      storageWarnings: document.getElementById("notifStorageWarnings").checked,
    },
  };

  const btn = document.getElementById("saveSettingsBtn");
  setSettingsDisabled(true);
  pageState("Saving preferences…");
  btn.textContent = "Saving…";

  try {
    await api.saveSettings(updatedSettings);
    updateShellUser(updatedSettings.account.name);
    toast("Settings saved to AWS", "success");
    pageState("Preferences saved to AWS.");
  } catch (error) {
    console.error(error);
    toast(error.message || "Could not save settings", "error");
    pageState("Preferences could not be saved. Please try Save Changes again.",true);
  } finally {
    setSettingsDisabled(false);
    btn.textContent = "Save Changes";
  }
}
