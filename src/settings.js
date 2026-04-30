export const defaultSettings = {
  enabled: true,
  debug: false,
  excludedAccountIds: [],
  markExistingOnStartup: true,
  startupDebounceMs: 4000,
  watchdogIntervalMs: 60000,
  processedMessageTtlMs: 300000,
  totalMarkedRead: 0,
  lastCleanupSummary: null,
  cleanupHistory: []
};

const maxCleanupHistoryEntries = 8;

export async function getSettings() {
  return messenger.storage.local.get(defaultSettings);
}

export async function ensureSettings() {
  const current = await getSettings();
  const missingEntries = Object.entries(defaultSettings).filter(
    ([key]) => typeof current[key] === "undefined"
  );

  if (missingEntries.length === 0) {
    return current;
  }

  const updates = Object.fromEntries(missingEntries);
  await messenger.storage.local.set(updates);
  return { ...current, ...updates };
}

export async function updateSettings(nextSettings) {
  await messenger.storage.local.set(nextSettings);
  return getSettings();
}

export async function incrementCleanupCount(amount) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return getSettings();
  }

  const current = await getSettings();
  const totalMarkedRead = Number(current.totalMarkedRead || 0) + amount;
  await messenger.storage.local.set({ totalMarkedRead });
  return { ...current, totalMarkedRead };
}

export async function resetCleanupCount() {
  await messenger.storage.local.set({ totalMarkedRead: 0 });
  return getSettings();
}

export async function setLastCleanupSummary(lastCleanupSummary) {
  const current = await getSettings();
  const cleanupHistory = [lastCleanupSummary, ...(current.cleanupHistory || [])]
    .filter(Boolean)
    .slice(0, maxCleanupHistoryEntries);

  await messenger.storage.local.set({ lastCleanupSummary, cleanupHistory });
  return getSettings();
}
