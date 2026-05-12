import { logInfo } from "./logger.js";
import { ensureSettings, getSettings } from "./settings.js";
import {
  handleFolderInfoChanged,
  handleMovedMessages,
  handleNewMailEvent,
  handleUpdatedMessage,
  processExistingUnreadJunk
} from "./spamHandler.js";

const startupScanAlarmName = "quietjunk-startup-scan";
const startupRetryAlarmNames = [
  "quietjunk-startup-retry-1",
  "quietjunk-startup-retry-2"
];
const startupRetryOffsetsMs = [30000, 90000];
const watchdogScanAlarmName = "quietjunk-watchdog-scan";
let activePatrolTimerId = null;
let activePatrolInFlight = false;

function clearActivePatrolTimer() {
  if (activePatrolTimerId !== null) {
    clearTimeout(activePatrolTimerId);
    activePatrolTimerId = null;
  }
}

async function scheduleStartupScan(settings, reason) {
  if (!settings.enabled || !settings.markExistingOnStartup) {
    await messenger.alarms.clear(startupScanAlarmName);
    for (const alarmName of startupRetryAlarmNames) {
      await messenger.alarms.clear(alarmName);
    }
    return false;
  }

  const startupDebounceMs = Math.max(0, Number(settings.startupDebounceMs) || 0);
  logInfo(
    `Scheduling startup junk scan in ${startupDebounceMs} ms (${reason}).`
  );

  await messenger.alarms.create(startupScanAlarmName, {
    when: Date.now() + startupDebounceMs
  });

  for (let index = 0; index < startupRetryAlarmNames.length; index += 1) {
    const alarmName = startupRetryAlarmNames[index];
    const retryOffsetMs = startupRetryOffsetsMs[index];

    await messenger.alarms.create(alarmName, {
      when: Date.now() + startupDebounceMs + retryOffsetMs
    });
  }

  return true;
}

async function scheduleWatchdogScan(settings, reason) {
  if (!settings.enabled) {
    await messenger.alarms.clear(watchdogScanAlarmName);
    return false;
  }

  const watchdogIntervalMs = Math.max(
    60000,
    Number(settings.watchdogIntervalMs) || 60000
  );
  const watchdogIntervalMinutes = watchdogIntervalMs / 60000;

  logInfo(
    `Scheduling watchdog junk scan every ${watchdogIntervalMs} ms (${reason}).`
  );

  await messenger.alarms.create(watchdogScanAlarmName, {
    delayInMinutes: watchdogIntervalMinutes,
    periodInMinutes: watchdogIntervalMinutes
  });

  return true;
}

async function runActivePatrolScan() {
  if (activePatrolInFlight) {
    return;
  }

  activePatrolInFlight = true;

  try {
    await processExistingUnreadJunk({
      ignoreStartupSetting: true,
      sourceLabel: "active-patrol",
      writeSummary: false,
      writeSummaryOnUpdate: true
    });
  } finally {
    activePatrolInFlight = false;
  }
}

async function scheduleActivePatrolScan(settings, reason) {
  clearActivePatrolTimer();

  if (!settings.enabled) {
    return false;
  }

  const activePatrolIntervalMs = Math.max(
    10000,
    Number(settings.activePatrolIntervalMs) || 20000
  );

  logInfo(
    `Scheduling active junk patrol every ${activePatrolIntervalMs} ms (${reason}).`
  );

  const scheduleNextPatrol = () => {
    activePatrolTimerId = setTimeout(async () => {
      try {
        await runActivePatrolScan();
      } catch (error) {
        console.error("[QuietJunk] Active junk patrol failed.", error);
      } finally {
        const nextSettings = await getSettings();
        if (nextSettings.enabled) {
          scheduleNextPatrol();
        } else {
          clearActivePatrolTimer();
        }
      }
    }, activePatrolIntervalMs);
  };

  scheduleNextPatrol();
  return true;
}

// John 1:5 - The light shines in the darkness.
const settings = await ensureSettings();

logInfo("Background script loaded.");

messenger.messages.onNewMailReceived.addListener(handleNewMailEvent, true);
messenger.messages.onMoved.addListener(handleMovedMessages);
messenger.messages.onUpdated.addListener(handleUpdatedMessage);
messenger.folders.onFolderInfoChanged.addListener(handleFolderInfoChanged);

logInfo("Listening for new mail, moved messages, junk updates, and folder count changes.");

messenger.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === startupScanAlarmName) {
    processExistingUnreadJunk().catch((error) => {
      console.error("[QuietJunk] Startup junk scan failed.", error);
    });
    return;
  }

  if (startupRetryAlarmNames.includes(alarm.name)) {
    processExistingUnreadJunk({
      ignoreStartupSetting: true,
      sourceLabel: alarm.name,
      writeSummary: false
    }).catch((error) => {
      console.error("[QuietJunk] Startup retry junk scan failed.", error);
    });
    return;
  }

  if (alarm.name === watchdogScanAlarmName) {
    processExistingUnreadJunk({
      ignoreStartupSetting: true,
      sourceLabel: "watchdog-scan",
      writeSummary: false,
      writeSummaryOnUpdate: true
    }).catch((error) => {
      console.error("[QuietJunk] Watchdog junk scan failed.", error);
    });
  }
});

await scheduleStartupScan(settings, "background-load");
await scheduleWatchdogScan(settings, "background-load");
await scheduleActivePatrolScan(settings, "background-load");

messenger.runtime.onStartup.addListener(async () => {
  const nextSettings = await getSettings();
  await scheduleStartupScan(nextSettings, "runtime.onStartup");
  await scheduleWatchdogScan(nextSettings, "runtime.onStartup");
  await scheduleActivePatrolScan(nextSettings, "runtime.onStartup");
});

messenger.runtime.onInstalled.addListener(async () => {
  const nextSettings = await getSettings();
  await scheduleStartupScan(nextSettings, "runtime.onInstalled");
  await scheduleWatchdogScan(nextSettings, "runtime.onInstalled");
  await scheduleActivePatrolScan(nextSettings, "runtime.onInstalled");
});

messenger.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (
    !changes.enabled &&
    !changes.markExistingOnStartup &&
    !changes.startupDebounceMs &&
    !changes.watchdogIntervalMs &&
    !changes.activePatrolIntervalMs
  ) {
    return;
  }

  const nextSettings = await getSettings();
  await scheduleStartupScan(nextSettings, "settings-change");
  await scheduleWatchdogScan(nextSettings, "settings-change");
  await scheduleActivePatrolScan(nextSettings, "settings-change");
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
