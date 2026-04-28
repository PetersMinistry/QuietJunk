import { logInfo } from "./logger.js";
import { ensureSettings, getSettings } from "./settings.js";
import {
  handleMovedMessages,
  handleNewMailEvent,
  handleUpdatedMessage,
  processExistingUnreadJunk
} from "./spamHandler.js";

const startupScanAlarmName = "quietjunk-startup-scan";

async function scheduleStartupScan(settings, reason) {
  if (!settings.enabled || !settings.markExistingOnStartup) {
    await messenger.alarms.clear(startupScanAlarmName);
    return false;
  }

  const startupDebounceMs = Math.max(0, Number(settings.startupDebounceMs) || 0);
  logInfo(
    `Scheduling startup junk scan in ${startupDebounceMs} ms (${reason}).`
  );

  await messenger.alarms.create(startupScanAlarmName, {
    when: Date.now() + startupDebounceMs
  });

  return true;
}

const settings = await ensureSettings();

logInfo("Background script loaded.");

messenger.messages.onNewMailReceived.addListener(handleNewMailEvent, true);
messenger.messages.onMoved.addListener(handleMovedMessages);
messenger.messages.onUpdated.addListener(handleUpdatedMessage);

logInfo("Listening for new mail, moved messages, and junk updates.");

messenger.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== startupScanAlarmName) {
    return;
  }

  processExistingUnreadJunk().catch((error) => {
    console.error("[QuietJunk] Startup junk scan failed.", error);
  });
});

await scheduleStartupScan(settings, "background-load");

messenger.runtime.onStartup.addListener(async () => {
  const nextSettings = await getSettings();
  await scheduleStartupScan(nextSettings, "runtime.onStartup");
});

messenger.runtime.onInstalled.addListener(async () => {
  const nextSettings = await getSettings();
  await scheduleStartupScan(nextSettings, "runtime.onInstalled");
});

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
  await scheduleStartupScan(nextSettings, "settings-change");
});

messenger.runtime.onMessage.addListener((message) => {
  if (message?.type !== "quietjunk:run-cleanup-now") {
    return false;
  }

  return processExistingUnreadJunk({
    ignoreStartupSetting: true,
    sourceLabel: "manual-scan"
  });
});
