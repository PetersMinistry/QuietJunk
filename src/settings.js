export const defaultSettings = {
  enabled: true,
  debug: false,
  excludedAccountIds: [],
  markExistingOnStartup: true,
  startupDebounceMs: 4000,
  totalMarkedRead: 0
};

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
