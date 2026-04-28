import { logInfo } from "./logger.js";
import { ensureSettings, getSettings } from "./settings.js";
import {
  handleMovedMessages,
  handleNewMailEvent,
  handleUpdatedMessage,
  processExistingUnreadJunk
} from "./spamHandler.js";

const startupScanAlarmName = "quietjunk-startup-scan";
const maintenanceScanAlarmName = "quietjunk-maintenance-scan";
const maintenanceScanPeriodMinutes = 1;

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

async function scheduleMaintenanceScan(settings, reason) {
  if (!settings.enabled) {
    await messenger.alarms.clear(maintenanceScanAlarmName);
    return false;
  }

  logInfo(
    `Scheduling maintenance junk scan every ${maintenanceScanPeriodMinutes} minute(s) (${reason}).`
  );

  await messenger.alarms.create(maintenanceScanAlarmName, {
    delayInMinutes: maintenanceScanPeriodMinutes,
    periodInMinutes: maintenanceScanPeriodMinutes
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
  if (alarm.name === startupScanAlarmName) {
    processExistingUnreadJunk().catch((error) => {
      console.error("[QuietJunk] Startup junk scan failed.", error);
    });
    return;
  }

  if (alarm.name === maintenanceScanAlarmName) {
    processExistingUnreadJunk({
      ignoreStartupSetting: true,
      sourceLabel: "maintenance-scan",
      writeSummary: false
    }).catch((error) => {
      console.error("[QuietJunk] Maintenance junk scan failed.", error);
    });
  }
});

await scheduleStartupScan(settings, "background-load");
await scheduleMaintenanceScan(settings, "background-load");

messenger.runtime.onStartup.addListener(async () => {
  const nextSettings = await getSettings();
  await scheduleStartupScan(nextSettings, "runtime.onStartup");
  await scheduleMaintenanceScan(nextSettings, "runtime.onStartup");
});

messenger.runtime.onInstalled.addListener(async () => {
  const nextSettings = await getSettings();
  await scheduleStartupScan(nextSettings, "runtime.onInstalled");
  await scheduleMaintenanceScan(nextSettings, "runtime.onInstalled");
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
  await scheduleMaintenanceScan(nextSettings, "settings-change");
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
