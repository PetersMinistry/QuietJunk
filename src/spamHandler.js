import { logDebug, logError, logInfo } from "./logger.js";
import {
  getSettings,
  incrementCleanupCount,
  setLastCleanupSummary
} from "./settings.js";

const recentlyProcessedMessages = new Map();

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

  if (!settings.enabled) {
    logInfo("Skipping junk cleanup because the extension is disabled.");
    return 0;
  }

  if (!isJunkFolder(folder)) {
    return 0;
  }

  if (isExcludedAccount(folder, settings)) {
    await logDebug(
      `Skipping ${sourceLabel} cleanup for excluded account ${folder.accountId} in ${getFolderLabel(folder)}.`
    );
    return 0;
  }

  let updatedCount = 0;
  const now = Date.now();

  for await (const message of iterateMessageList(messageList)) {
    if (message.read) {
      continue;
    }

    if (shouldSkipRecentlyProcessed(message.id, settings, now)) {
      await logDebug(
        `Skipping recently processed message ${message.id} in ${getFolderLabel(folder)}.`
      );
      continue;
    }

    try {
      await messenger.messages.update(message.id, { read: true });
      updatedCount += 1;
      await logDebug(
        `Marked junk message as read from ${sourceLabel}: ${message.subject || "(no subject)"}`
      );
    } catch (error) {
      logError(
        `Failed to update message ${message.id} in folder ${getFolderLabel(folder)}.`,
        error
      );
    }
  }

  if (updatedCount > 0) {
    const nextSettings = await incrementCleanupCount(updatedCount);
    logInfo(
      `Cleared ${updatedCount} unread junk message(s) in ${getFolderLabel(folder)}. Total cleared: ${nextSettings.totalMarkedRead}.`
    );
  }

  return updatedCount;
}

export async function handleNewMailEvent(folder, messageList) {
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
    totalUpdated += await markUnreadMessagesAsRead(
      folder,
      createMessageList(messages),
      "moved-to-junk"
    );
  }

  return totalUpdated;
}

export async function handleUpdatedMessage(message, changedProperties) {
  if (!changedProperties?.junk || !message?.folder) {
    return 0;
  }

  return markUnreadMessagesAsRead(
    message.folder,
    createMessageList([message]),
    "junk-updated"
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
  const matchedFolderNames = junkFolders.map(
    (folder) => folder?.name || folder?.path || String(folder?.id || "unknown")
  );

  await logDebug(`Startup scan found ${junkFolders.length} junk folder(s).`);

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
    await logDebug(`${sourceLabel} found no unread junk messages to clear.`);
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
