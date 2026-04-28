import { logInfo } from "./logger.js";
import { ensureSettings } from "./settings.js";
import { handleNewMailEvent, processExistingUnreadJunk } from "./spamHandler.js";

const settings = await ensureSettings();

logInfo("Background script loaded.");

messenger.messages.onNewMailReceived.addListener(handleNewMailEvent, true);

logInfo("Listening for new mail across all folders.");

const startupDebounceMs = Math.max(0, Number(settings.startupDebounceMs) || 0);

if (settings.markExistingOnStartup) {
  logInfo(`Scheduling startup junk scan in ${startupDebounceMs} ms.`);
  globalThis.setTimeout(() => {
    processExistingUnreadJunk().catch((error) => {
      console.error("[QuietJunk] Startup junk scan failed.", error);
    });
  }, startupDebounceMs);
}
