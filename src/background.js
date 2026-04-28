import { logInfo } from "./logger.js";
import { ensureSettings, getSettings } from "./settings.js";
import { handleNewMailEvent, processExistingUnreadJunk } from "./spamHandler.js";

let startupScanTimeoutId = null;

function scheduleStartupScan(settings) {
  if (startupScanTimeoutId) {
    globalThis.clearTimeout(startupScanTimeoutId);
    startupScanTimeoutId = null;
  }

  if (!settings.enabled || !settings.markExistingOnStartup) {
    return;
  }

  const startupDebounceMs = Math.max(0, Number(settings.startupDebounceMs) || 0);
  logInfo(`Scheduling startup junk scan in ${startupDebounceMs} ms.`);

  startupScanTimeoutId = globalThis.setTimeout(() => {
    processExistingUnreadJunk().catch((error) => {
      console.error("[QuietJunk] Startup junk scan failed.", error);
    });
  }, startupDebounceMs);
}

const settings = await ensureSettings();

logInfo("Background script loaded.");

messenger.messages.onNewMailReceived.addListener(handleNewMailEvent, true);

logInfo("Listening for new mail across all folders.");

scheduleStartupScan(settings);

messenger.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (
    !changes.enabled &&
    !changes.markExistingOnStartup &&
    !changes.startupDebounceMs
  ) {
    return;
  }

  const nextSettings = await getSettings();
  scheduleStartupScan(nextSettings);
});
