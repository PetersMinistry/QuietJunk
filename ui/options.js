import {
  getSettings,
  resetCleanupCount,
  updateSettings
} from "../src/settings.js";
import { processExistingUnreadJunk } from "../src/spamHandler.js";

const form = document.getElementById("settings-form");
const enabledInput = document.getElementById("enabled");
const debugInput = document.getElementById("debug");
const markExistingOnStartupInput = document.getElementById("markExistingOnStartup");
const startupDebounceMsInput = document.getElementById("startupDebounceMs");
const processedMessageTtlMsInput = document.getElementById("processedMessageTtlMs");
const accountsList = document.getElementById("accounts-list");
const cleanupCounter = document.getElementById("cleanup-counter");
const runCleanupNowButton = document.getElementById("run-cleanup-now");
const lastCleanupSummary = document.getElementById("last-cleanup-summary");
const cleanupHistory = document.getElementById("cleanup-history");
const resetCounterButton = document.getElementById("reset-counter");
const status = document.getElementById("status");
const tabButtons = [...document.querySelectorAll(".tab")];
const tabPanels = [...document.querySelectorAll(".tab-panel")];
const aboutVersion = document.getElementById("about-version");
const aboutManifest = document.getElementById("about-manifest");

function showPanel(panelId) {
  for (const button of tabButtons) {
    const isActive = button.dataset.panel === panelId;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  }

  for (const panel of tabPanels) {
    const isActive = panel.id === panelId;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  }
}

function createAccountRow(account, settings) {
  const wrapper = document.createElement("label");
  wrapper.className = "account-item";

  const meta = document.createElement("span");
  meta.className = "account-meta";

  const title = document.createElement("strong");
  title.textContent = account.name;

  const subtitle = document.createElement("small");
  subtitle.textContent = `${account.type} account`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = account.id;
  checkbox.checked = !settings.excludedAccountIds.includes(account.id);
  checkbox.dataset.accountId = account.id;

  const toggle = document.createElement("span");
  toggle.className = "account-toggle";
  toggle.setAttribute("aria-hidden", "true");

  meta.append(title, subtitle);
  wrapper.append(meta, checkbox, toggle);

  return wrapper;
}

function renderCleanupSummary(summary) {
  if (!summary) {
    lastCleanupSummary.textContent = "No cleanup summary yet.";
    return;
  }

  const folderList = summary.matchedFolderNames?.length
    ? summary.matchedFolderNames.join(", ")
    : "none";

  lastCleanupSummary.textContent =
    `${summary.totalUpdated} cleared | ${summary.scannedFolderCount} folder(s) scanned | ` +
    `folders: ${folderList} | reason: ${summary.reason} | ${summary.ranAt}`;
}

function formatHistoryEntry(summary) {
  const sourceLabel = summary.sourceLabel?.replaceAll("-", " ") || "cleanup run";
  const main = `${summary.totalUpdated} cleared from ${summary.scannedFolderCount} folder(s)`;
  const meta = `${sourceLabel} | ${summary.reason} | ${summary.ranAt}`;
  return { main, meta };
}

function renderCleanupHistory(history) {
  cleanupHistory.textContent = "";

  if (!history?.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "summary-history-empty";
    emptyState.textContent = "No cleanup history yet.";
    cleanupHistory.append(emptyState);
    return;
  }

  for (const summary of history) {
    const item = document.createElement("div");
    item.className = "summary-history-item";

    const main = document.createElement("p");
    main.className = "summary-history-main";

    const meta = document.createElement("p");
    meta.className = "summary-history-meta";

    const entry = formatHistoryEntry(summary);
    main.textContent = entry.main;
    meta.textContent = entry.meta;

    item.append(main, meta);
    cleanupHistory.append(item);
  }
}

async function renderAccounts(settings) {
  const accounts = await messenger.accounts.list(false);
  accountsList.textContent = "";

  if (accounts.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "status";
    emptyState.textContent = "No accounts are available to configure right now.";
    accountsList.append(emptyState);
    return;
  }

  for (const account of accounts) {
    accountsList.append(createAccountRow(account, settings));
  }
}

async function loadSettings() {
  const settings = await getSettings();
  applySettingsToView(settings);
  await renderAccounts(settings);
}

function applySettingsToView(settings) {
  enabledInput.checked = settings.enabled;
  debugInput.checked = settings.debug;
  markExistingOnStartupInput.checked = settings.markExistingOnStartup;
  startupDebounceMsInput.value = settings.startupDebounceMs;
  processedMessageTtlMsInput.value = settings.processedMessageTtlMs;
  cleanupCounter.textContent = String(settings.totalMarkedRead || 0);
  renderCleanupSummary(settings.lastCleanupSummary);
  renderCleanupHistory(settings.cleanupHistory);
}

for (const button of tabButtons) {
  button.addEventListener("click", () => {
    showPanel(button.dataset.panel);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const includedAccountIds = [
    ...accountsList.querySelectorAll("input[data-account-id]:checked")
  ].map((input) => input.dataset.accountId);

  const allAccountIds = [
    ...accountsList.querySelectorAll("input[data-account-id]")
  ].map((input) => input.dataset.accountId);

  const nextSettings = await updateSettings({
    enabled: enabledInput.checked,
    debug: debugInput.checked,
    markExistingOnStartup: markExistingOnStartupInput.checked,
    startupDebounceMs: Math.max(0, Number(startupDebounceMsInput.value) || 0),
    processedMessageTtlMs: Math.max(
      0,
      Number(processedMessageTtlMsInput.value) || 0
    ),
    excludedAccountIds: allAccountIds.filter(
      (accountId) => !includedAccountIds.includes(accountId)
    )
  });

  cleanupCounter.textContent = String(nextSettings.totalMarkedRead || 0);
  status.textContent = "Settings saved.";
  window.setTimeout(() => {
    status.textContent = "";
  }, 1600);
});

runCleanupNowButton.addEventListener("click", async () => {
  runCleanupNowButton.disabled = true;
  status.textContent = "Running cleanup...";

  try {
    let summary;

    try {
      summary = await messenger.runtime.sendMessage({
        type: "quietjunk:run-cleanup-now"
      });
    } catch (error) {
      if (!String(error?.message || error).includes("Could not establish connection")) {
        throw error;
      }

      summary = await processExistingUnreadJunk({
        ignoreStartupSetting: true,
        sourceLabel: "manual-scan"
      });
    }

    const nextSettings = await getSettings();
    cleanupCounter.textContent = String(nextSettings.totalMarkedRead || 0);
    renderCleanupSummary(summary);
    renderCleanupHistory(nextSettings.cleanupHistory);
    status.textContent = `Cleanup finished: ${summary.totalUpdated} cleared.`;
  } finally {
    runCleanupNowButton.disabled = false;
    window.setTimeout(() => {
      status.textContent = "";
    }, 2200);
  }
});

resetCounterButton.addEventListener("click", async () => {
  const nextSettings = await resetCleanupCount();
  cleanupCounter.textContent = String(nextSettings.totalMarkedRead || 0);
  status.textContent = "Cleared counter reset.";
  window.setTimeout(() => {
    status.textContent = "";
  }, 1600);
});

messenger.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (
    !changes.totalMarkedRead &&
    !changes.lastCleanupSummary &&
    !changes.cleanupHistory &&
    !changes.enabled &&
    !changes.debug &&
    !changes.markExistingOnStartup &&
    !changes.startupDebounceMs &&
    !changes.processedMessageTtlMs
  ) {
    return;
  }

  const nextSettings = await getSettings();
  applySettingsToView(nextSettings);
});

const manifest = messenger.runtime.getManifest();
aboutVersion.textContent = manifest.version;
aboutManifest.textContent = `MV${manifest.manifest_version}`;

await loadSettings();
