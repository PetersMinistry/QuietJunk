import { logDebug, logError, logInfo } from "./logger.js";
import {
  getSettings,
  incrementCleanupCount,
  setLastCleanupSummary
} from "./settings.js";

const recentlyProcessedMessages = new Map();
let cachedAccounts = null;
let cachedAccountsAt = 0;
const accountCacheTtlMs = 30000;

function pruneProcessedMessages(now) {
  for (const [messageId, expiresAt] of recentlyProcessedMessages) {
    if (expiresAt <= now) {
      recentlyProcessedMessages.delete(messageId);
    }
  }
}

function wasRecentlyProcessed(messageId, settings, now) {
  const processedMessageTtlMs = Math.max(
    0,
    Number(settings.processedMessageTtlMs) || 0
  );

  if (processedMessageTtlMs === 0) {
    return false;
  }

  pruneProcessedMessages(now);
  return (recentlyProcessedMessages.get(messageId) || 0) > now;
}

function rememberProcessedMessage(messageId, settings, now) {
  const processedMessageTtlMs = Math.max(
    0,
    Number(settings.processedMessageTtlMs) || 0
  );

  if (processedMessageTtlMs > 0) {
    recentlyProcessedMessages.set(messageId, now + processedMessageTtlMs);
  }
}

async function* iterateMessageList(page) {
  for (const message of page.messages) {
    yield message;
  }

  while (page.id) {
    page = await messenger.messages.continueList(page.id);
    for (const message of page.messages) {
      yield message;
    }
  }
}

async function getAccountMap() {
  const now = Date.now();
  if (cachedAccounts && now - cachedAccountsAt < accountCacheTtlMs) {
    return cachedAccounts;
  }

  const accounts = await messenger.accounts.list(false);
  cachedAccounts = new Map(
    accounts
      .filter((account) => account?.id)
      .map((account) => [account.id, account.name || account.id])
  );
  cachedAccountsAt = now;
  return cachedAccounts;
}

async function getAccountLabel(accountId) {
  if (!accountId) {
    return "unknown-account";
  }

  const accounts = await getAccountMap();
  return accounts.get(accountId) || accountId;
}

function isJunkFolder(folder) {
  return folder?.type === "junk" || folder?.specialUse?.includes("junk");
}

function isExcludedAccount(folder, settings) {
  return Boolean(
    folder?.accountId && settings.excludedAccountIds.includes(folder.accountId)
  );
}

function isScannableFolder(folder) {
  return Boolean(
    folder?.accountId &&
    folder?.id &&
    !folder.isUnified &&
    !folder.isVirtual &&
    !folder.isTag
  );
}

function getFolderLabel(folder) {
  return folder?.path || folder?.name || folder?.id || "unknown folder";
}

async function createFolderContext(folder) {
  const accountName = await getAccountLabel(folder?.accountId);

  return {
    account: {
      id: folder?.accountId || null,
      name: accountName
    },
    folder: {
      id: folder?.id || null,
      name: folder?.name || null,
      path: folder?.path || null,
      label: getFolderLabel(folder),
      type: folder?.type || "unknown-type",
      specialUse: Array.isArray(folder?.specialUse) ? folder.specialUse : []
    }
  };
}

function formatFolderContext(context) {
  return `${context.account.name} :: ${context.folder.label} [type=${context.folder.type}; specialUse=${context.folder.specialUse.join(",") || "none"}; accountId=${context.account.id || "none"}]`;
}

function createScanResult({
  sourceLabel,
  folder,
  scannedCount = 0,
  unreadCount = 0,
  updatedCount = 0,
  skipReason = null,
  errors = []
}) {
  return {
    sourceLabel,
    account: folder.account,
    folder: folder.folder,
    scannedCount,
    unreadCount,
    updatedCount,
    skipReason,
    errors,
    ranAt: new Date().toISOString()
  };
}

function collectJunkFolders(folder, junkFolders = []) {
  if (!folder) {
    return junkFolders;
  }

  if (isJunkFolder(folder)) {
    junkFolders.push(folder);
  }

  if (Array.isArray(folder.subFolders)) {
    for (const subFolder of folder.subFolders) {
      collectJunkFolders(subFolder, junkFolders);
    }
  }

  return junkFolders;
}

async function findJunkFolders(settings) {
  const accounts = await messenger.accounts.list(true);
  const discoveredFolders = [];

  for (const account of accounts) {
    if (!account?.id || settings.excludedAccountIds.includes(account.id)) {
      continue;
    }

    collectJunkFolders(account.rootFolder, discoveredFolders);
  }

  if (discoveredFolders.length > 0) {
    return discoveredFolders.filter(isScannableFolder);
  }

  const queriedFolders = await messenger.folders.query({
    specialUse: ["junk"]
  });

  return queriedFolders.filter(
    (folder) =>
      isScannableFolder(folder) &&
      !settings.excludedAccountIds.includes(folder.accountId)
  );
}

function createCleanupSummary({
  sourceLabel,
  folderResults,
  reason
}) {
  const updatedResults = folderResults.filter((result) => result.updatedCount > 0);

  return {
    sourceLabel,
    totalUpdated: folderResults.reduce(
      (total, result) => total + result.updatedCount,
      0
    ),
    scannedFolderCount: folderResults.length,
    matchedFolderNames: folderResults.map(
      (result) => `${result.account.name} :: ${result.folder.label}`
    ),
    reason,
    folderResults,
    updatedFolderCount: updatedResults.length,
    ranAt: new Date().toISOString()
  };
}

export async function markUnreadMessagesAsRead(folder, messageList, sourceLabel) {
  const settings = await getSettings();
  const folderContext = await createFolderContext(folder);
  const folderDebugLabel = formatFolderContext(folderContext);

  if (!settings.enabled) {
    const result = createScanResult({
      sourceLabel,
      folder: folderContext,
      skipReason: "extension-disabled"
    });
    logInfo("Skipping junk cleanup because the extension is disabled.");
    return result;
  }

  if (!isJunkFolder(folder)) {
    const result = createScanResult({
      sourceLabel,
      folder: folderContext,
      skipReason: "not-junk-folder"
    });
    await logDebug(
      `Skipping ${sourceLabel} because folder is not recognized as junk: ${folderDebugLabel}.`
    );
    return result;
  }

  if (!isScannableFolder(folder)) {
    const result = createScanResult({
      sourceLabel,
      folder: folderContext,
      skipReason: "not-scannable-folder"
    });
    await logDebug(
      `Skipping ${sourceLabel} because folder is not scannable: ${folderDebugLabel}.`
    );
    return result;
  }

  if (isExcludedAccount(folder, settings)) {
    const result = createScanResult({
      sourceLabel,
      folder: folderContext,
      skipReason: "excluded-account"
    });
    await logDebug(
      `Skipping ${sourceLabel} cleanup for excluded account in ${folderDebugLabel}.`
    );
    return result;
  }

  let scannedCount = 0;
  let unreadCount = 0;
  let updatedCount = 0;
  const errors = [];
  const now = Date.now();

  for await (const message of iterateMessageList(messageList)) {
    scannedCount += 1;

    if (message.read) {
      continue;
    }

    unreadCount += 1;

    if (wasRecentlyProcessed(message.id, settings, now)) {
      await logDebug(
        `Skipping recently processed message ${message.id} in ${folderDebugLabel}.`
      );
      continue;
    }

    try {
      await messenger.messages.update(message.id, { read: true });
      updatedCount += 1;
      rememberProcessedMessage(message.id, settings, now);
      await logDebug(
        `Marked junk message as read from ${sourceLabel} in ${folderDebugLabel}: ${message.subject || "(no subject)"}`
      );
    } catch (error) {
      errors.push({
        messageId: message.id,
        message: error?.message || String(error)
      });
      logError(
        `Failed to update message ${message.id} in folder ${folderDebugLabel}.`,
        error
      );
    }
  }

  if (updatedCount > 0) {
    const nextSettings = await incrementCleanupCount(updatedCount);
    logInfo(
      `Cleared ${updatedCount} unread junk message(s) from ${sourceLabel} in ${folderDebugLabel}. Total cleared: ${nextSettings.totalMarkedRead}.`
    );
  } else {
    await logDebug(
      `${sourceLabel} scanned ${scannedCount} message(s), saw ${unreadCount} unread, and updated ${updatedCount} in ${folderDebugLabel}.`
    );
  }

  return createScanResult({
    sourceLabel,
    folder: folderContext,
    scannedCount,
    unreadCount,
    updatedCount,
    skipReason: errors.length > 0 ? "update-errors" : null,
    errors
  });
}

export async function scanJunkFolder(folder, sourceLabel) {
  const settings = await getSettings();
  const folderContext = await createFolderContext(folder);
  const folderDebugLabel = formatFolderContext(folderContext);

  await logDebug(`Scanning ${folderDebugLabel} from ${sourceLabel}.`);

  if (!settings.enabled) {
    await logDebug(
      `Skipping ${sourceLabel} because QuietJunk is disabled: ${folderDebugLabel}.`
    );
    return createScanResult({
      sourceLabel,
      folder: folderContext,
      skipReason: "extension-disabled"
    });
  }

  if (!isJunkFolder(folder)) {
    await logDebug(
      `Skipping ${sourceLabel} before query because folder is not recognized as junk: ${folderDebugLabel}.`
    );
    return createScanResult({
      sourceLabel,
      folder: folderContext,
      skipReason: "not-junk-folder"
    });
  }

  if (!isScannableFolder(folder)) {
    await logDebug(
      `Skipping ${sourceLabel} before query because folder is not scannable: ${folderDebugLabel}.`
    );
    return createScanResult({
      sourceLabel,
      folder: folderContext,
      skipReason: "not-scannable-folder"
    });
  }

  if (isExcludedAccount(folder, settings)) {
    await logDebug(
      `Skipping ${sourceLabel} before query because account is excluded: ${folderDebugLabel}.`
    );
    return createScanResult({
      sourceLabel,
      folder: folderContext,
      skipReason: "excluded-account"
    });
  }

  const unreadJunkMessages = await messenger.messages.query({
    folderId: folder.id,
    includeSubFolders: false,
    read: false,
    messagesPerPage: 100,
    autoPaginationTimeout: 0
  });

  return markUnreadMessagesAsRead(folder, unreadJunkMessages, sourceLabel);
}

export async function scanAllJunkFolders(sourceLabel, options = {}) {
  const {
    ignoreStartupSetting = false,
    writeSummary = true,
    writeSummaryOnUpdate = false
  } = options;
  const settings = await getSettings();

  if (!settings.enabled || (!ignoreStartupSetting && !settings.markExistingOnStartup)) {
    const folderResults = [];
    const summary = createCleanupSummary({
      sourceLabel,
      folderResults,
      reason: settings.enabled ? "startup-disabled" : "extension-disabled"
    });

    if (writeSummary) {
      await setLastCleanupSummary(summary);
    }

    return summary;
  }

  const junkFolders = await findJunkFolders(settings);
  const folderResults = [];

  await logDebug(`${sourceLabel} found ${junkFolders.length} junk folder(s).`);

  for (const folder of junkFolders) {
    folderResults.push(await scanJunkFolder(folder, sourceLabel));
  }

  const totalUpdated = folderResults.reduce(
    (total, result) => total + result.updatedCount,
    0
  );
  const reason = junkFolders.length > 0 ? "completed" : "no-matching-folders";
  const summary = createCleanupSummary({
    sourceLabel,
    folderResults,
    reason
  });

  if (totalUpdated > 0) {
    logInfo(`${sourceLabel} cleared ${totalUpdated} unread junk message(s).`);
  } else {
    await logDebug(`${sourceLabel} found no unread junk messages to clear.`);
  }

  if (writeSummary || (writeSummaryOnUpdate && totalUpdated > 0)) {
    await setLastCleanupSummary(summary);
  }

  return summary;
}

export async function handleNewMailEvent(folder) {
  await logDebug(
    `Received new-mail event for ${formatFolderContext(await createFolderContext(folder))}.`
  );
  return scanJunkFolder(folder, "new-mail");
}

export async function handleMovedMessages(_originalMessages, movedMessages) {
  const foldersById = new Map();

  for await (const message of iterateMessageList(movedMessages)) {
    const folder = message?.folder;
    if (folder?.id) {
      foldersById.set(folder.id, folder);
    }
  }

  const results = [];

  for (const folder of foldersById.values()) {
    await logDebug(
      `Received moved-to-folder event for ${formatFolderContext(await createFolderContext(folder))}.`
    );
    results.push(await scanJunkFolder(folder, "moved-to-junk"));
  }

  return results;
}

export async function handleUpdatedMessage(message, changedProperties) {
  await logDebug(
    `Received updated-message event for ${formatFolderContext(await createFolderContext(message?.folder))} with changedProperties=${JSON.stringify(changedProperties || {})}.`
  );

  if (!changedProperties?.junk || !message?.folder) {
    return createScanResult({
      sourceLabel: "junk-updated",
      folder: await createFolderContext(message?.folder),
      skipReason: "not-junk-update"
    });
  }

  return scanJunkFolder(message.folder, "junk-updated");
}

export async function handleFolderInfoChanged(folder, folderInfo) {
  await logDebug(
    `Received folder-info change for ${formatFolderContext(await createFolderContext(folder))} with folderInfo=${JSON.stringify(folderInfo || {})}.`
  );

  return scanJunkFolder(folder, "folder-info-changed");
}

export async function processExistingUnreadJunk(options = {}) {
  const {
    sourceLabel = "startup-scan",
    ...scanOptions
  } = options;

  return scanAllJunkFolders(sourceLabel, scanOptions);
}
