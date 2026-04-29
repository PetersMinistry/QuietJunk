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
    if (expiresAt > now) {
      continue;
    }

    recentlyProcessedMessages.delete(messageId);
  }
}

function shouldSkipRecentlyProcessed(messageId, settings, now) {
  const processedMessageTtlMs = Math.max(
    0,
    Number(settings.processedMessageTtlMs) || 0
  );

  if (processedMessageTtlMs === 0) {
    return false;
  }

  pruneProcessedMessages(now);

  const expiresAt = recentlyProcessedMessages.get(messageId);
  if (expiresAt && expiresAt > now) {
    return true;
  }

  recentlyProcessedMessages.set(messageId, now + processedMessageTtlMs);
  return false;
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

function createMessageList(messages) {
  return {
    messages,
    id: null
  };
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

function getFolderLabel(folder) {
  return folder?.path || folder?.name || folder?.id || "unknown folder";
}

async function getFolderDebugLabel(folder) {
  const accountLabel = await getAccountLabel(folder?.accountId);
  const folderLabel = getFolderLabel(folder);
  const folderType = folder?.type || "unknown-type";
  const specialUse = Array.isArray(folder?.specialUse) && folder.specialUse.length > 0
    ? folder.specialUse.join(",")
    : "none";

  return `${accountLabel} :: ${folderLabel} [type=${folderType}; specialUse=${specialUse}; accountId=${folder?.accountId || "none"}]`;
}

async function getSummaryFolderLabel(folder) {
  const accountLabel = await getAccountLabel(folder?.accountId);
  return `${accountLabel} :: ${getFolderLabel(folder)}`;
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
    return discoveredFolders.filter(
      (folder) => folder?.accountId && !folder.isUnified && !folder.isVirtual && !folder.isTag
    );
  }

  const queriedFolders = await messenger.folders.query({
    specialUse: ["junk"]
  });

  return queriedFolders.filter(
    (folder) =>
      folder?.accountId &&
      !folder.isUnified &&
      !folder.isVirtual &&
      !folder.isTag &&
      !settings.excludedAccountIds.includes(folder.accountId)
  );
}

function createCleanupSummary({
  sourceLabel,
  totalUpdated,
  scannedFolderCount,
  matchedFolderNames,
  reason
}) {
  return {
    sourceLabel,
    totalUpdated,
    scannedFolderCount,
    matchedFolderNames,
    reason,
    ranAt: new Date().toISOString()
  };
}

async function markUnreadMessagesAsRead(folder, messageList, sourceLabel) {
  const settings = await getSettings();
  const folderDebugLabel = await getFolderDebugLabel(folder);

  if (!settings.enabled) {
    logInfo("Skipping junk cleanup because the extension is disabled.");
    return 0;
  }

  if (!isJunkFolder(folder)) {
    await logDebug(
      `Skipping ${sourceLabel} because folder is not recognized as junk: ${folderDebugLabel}.`
    );
    return 0;
  }

  if (isExcludedAccount(folder, settings)) {
    await logDebug(
      `Skipping ${sourceLabel} cleanup for excluded account in ${folderDebugLabel}.`
    );
    return 0;
  }

  let updatedCount = 0;
  let unreadSeen = 0;
  const now = Date.now();

  for await (const message of iterateMessageList(messageList)) {
    if (message.read) {
      continue;
    }

    unreadSeen += 1;

    if (shouldSkipRecentlyProcessed(message.id, settings, now)) {
      await logDebug(
        `Skipping recently processed message ${message.id} in ${folderDebugLabel}.`
      );
      continue;
    }

    try {
      await messenger.messages.update(message.id, { read: true });
      updatedCount += 1;
      await logDebug(
        `Marked junk message as read from ${sourceLabel} in ${folderDebugLabel}: ${message.subject || "(no subject)"}`
      );
    } catch (error) {
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
      `${sourceLabel} saw ${unreadSeen} unread message(s) but updated ${updatedCount} in ${folderDebugLabel}.`
    );
  }

  return updatedCount;
}

export async function handleNewMailEvent(folder, messageList) {
  await logDebug(
    `Received new-mail event for ${await getFolderDebugLabel(folder)}.`
  );
  return markUnreadMessagesAsRead(folder, messageList, "new-mail");
}

export async function handleMovedMessages(_originalMessages, movedMessages) {
  const messagesByFolder = new Map();

  for await (const message of iterateMessageList(movedMessages)) {
    const folder = message?.folder;
    if (!folder?.id) {
      continue;
    }

    const existingEntry = messagesByFolder.get(folder.id);
    if (existingEntry) {
      existingEntry.messages.push(message);
      continue;
    }

    messagesByFolder.set(folder.id, {
      folder,
      messages: [message]
    });
  }

  let totalUpdated = 0;

  for (const { folder, messages } of messagesByFolder.values()) {
    await logDebug(
      `Received moved-to-folder event for ${await getFolderDebugLabel(folder)} with ${messages.length} message(s).`
    );
    totalUpdated += await markUnreadMessagesAsRead(
      folder,
      createMessageList(messages),
      "moved-to-junk"
    );
  }

  return totalUpdated;
}

export async function handleUpdatedMessage(message, changedProperties) {
  await logDebug(
    `Received updated-message event for ${await getFolderDebugLabel(message?.folder)} with changedProperties=${JSON.stringify(changedProperties || {})}.`
  );

  if (!changedProperties?.junk || !message?.folder) {
    return 0;
  }

  return markUnreadMessagesAsRead(
    message.folder,
    createMessageList([message]),
    "junk-updated"
  );
}

export async function handleFolderInfoChanged(folder, folderInfo) {
  const folderDebugLabel = await getFolderDebugLabel(folder);
  await logDebug(
    `Received folder-info change for ${folderDebugLabel} with folderInfo=${JSON.stringify(folderInfo || {})}.`
  );

  if (!isJunkFolder(folder)) {
    await logDebug(
      `Ignoring folder-info change because folder is not recognized as junk: ${folderDebugLabel}.`
    );
    return 0;
  }

  const unreadMessageCount = Number(folderInfo?.unreadMessageCount ?? 0);
  const newMessageCount = Number(folderInfo?.newMessageCount ?? 0);

  if (unreadMessageCount <= 0 && newMessageCount <= 0) {
    return 0;
  }

  const unreadJunkMessages = await messenger.messages.query({
    folderId: folder.id,
    includeSubFolders: false,
    read: false,
    messagesPerPage: 100,
    autoPaginationTimeout: 0
  });

  return markUnreadMessagesAsRead(
    folder,
    unreadJunkMessages,
    "folder-info-changed"
  );
}

export async function processExistingUnreadJunk(options = {}) {
  const {
    ignoreStartupSetting = false,
    sourceLabel = "startup-scan",
    writeSummary = true
  } = options;
  const settings = await getSettings();

  if (!settings.enabled || (!ignoreStartupSetting && !settings.markExistingOnStartup)) {
    const summary = createCleanupSummary({
      sourceLabel,
      totalUpdated: 0,
      scannedFolderCount: 0,
      matchedFolderNames: [],
      reason: settings.enabled ? "startup-disabled" : "extension-disabled"
    });
    if (writeSummary) {
      await setLastCleanupSummary(summary);
    }
    return summary;
  }

  const junkFolders = await findJunkFolders(settings);

  let totalUpdated = 0;
  const matchedFolderNames = await Promise.all(
    junkFolders.map((folder) => getSummaryFolderLabel(folder))
  );

  await logDebug(
    `${sourceLabel} found ${junkFolders.length} junk folder(s): ${matchedFolderNames.join(" | ") || "none"}.`
  );

  for (const folder of junkFolders) {
    const unreadJunkMessages = await messenger.messages.query({
      folderId: folder.id,
      includeSubFolders: false,
      read: false,
      messagesPerPage: 100,
      autoPaginationTimeout: 0
    });

    totalUpdated += await markUnreadMessagesAsRead(
      folder,
      unreadJunkMessages,
      sourceLabel
    );
  }

  if (totalUpdated > 0) {
    logInfo(`${sourceLabel} cleared ${totalUpdated} unread junk message(s).`);
  } else {
    await logDebug(`${sourceLabel} found no unread junk messages to clear across matched folders.`);
  }

  const summary = createCleanupSummary({
    sourceLabel,
    totalUpdated,
    scannedFolderCount: junkFolders.length,
    matchedFolderNames,
    reason: junkFolders.length > 0 ? "completed" : "no-matching-folders"
  });

  if (writeSummary) {
    await setLastCleanupSummary(summary);
  }
  return summary;
}
