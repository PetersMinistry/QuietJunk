import {
  getSettings,
  resetCleanupCount,
  updateSettings
} from "../src/settings.js";

const form = document.getElementById("settings-form");
const enabledInput = document.getElementById("enabled");
const debugInput = document.getElementById("debug");
const markExistingOnStartupInput = document.getElementById("markExistingOnStartup");
const startupDebounceMsInput = document.getElementById("startupDebounceMs");
const processedMessageTtlMsInput = document.getElementById("processedMessageTtlMs");
const accountsList = document.getElementById("accounts-list");
const cleanupCounter = document.getElementById("cleanup-counter");
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

async function renderAccounts(settings) {
  const accounts = await messenger.accounts.list(false);
  accountsList.textContent = "";

  if (accounts.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "status";
    emptyState.textContent = "No accounts are currently available to configure.";
    accountsList.append(emptyState);
    return;
  }

  for (const account of accounts) {
    accountsList.append(createAccountRow(account, settings));
  }
}

async function loadSettings() {
  const settings = await getSettings();
  const manifest = messenger.runtime.getManifest();
  enabledInput.checked = settings.enabled;
  debugInput.checked = settings.debug;
  markExistingOnStartupInput.checked = settings.markExistingOnStartup;
  startupDebounceMsInput.value = settings.startupDebounceMs;
  processedMessageTtlMsInput.value = settings.processedMessageTtlMs;
  cleanupCounter.textContent = String(settings.totalMarkedRead || 0);
  aboutVersion.textContent = manifest.version;
  aboutManifest.textContent = `MV${manifest.manifest_version}`;
  await renderAccounts(settings);
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

resetCounterButton.addEventListener("click", async () => {
  const nextSettings = await resetCleanupCount();
  cleanupCounter.textContent = String(nextSettings.totalMarkedRead || 0);
  status.textContent = "Cleared counter reset.";
  window.setTimeout(() => {
    status.textContent = "";
  }, 1600);
});

await loadSettings();
