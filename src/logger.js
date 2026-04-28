import { getSettings } from "./settings.js";

const prefix = "[QuietJunk]";

export function logInfo(message, ...details) {
  console.info(`${prefix} ${message}`, ...details);
}

export function logError(message, ...details) {
  console.error(`${prefix} ${message}`, ...details);
}

export async function logDebug(message, ...details) {
  const settings = await getSettings();
  if (!settings.debug) {
    return;
  }

  console.debug(`${prefix} ${message}`, ...details);
}
