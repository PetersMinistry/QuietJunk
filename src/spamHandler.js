import { logDebug, logError, logInfo } from "./logger.js";
import { getSettings, incrementCleanupCount } from "./settings.js";

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

  for await (const message of iterateMessageList(messageList)) {
    if (message.read) {
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

export async function processExistingUnreadJunk() {
  const settings = await getSettings();

  if (!settings.enabled || !settings.markExistingOnStartup) {
    return 0;
  }

  const junkFolders = await findJunkFolders(settings);

  let totalUpdated = 0;

  await logDebug(`Startup scan found ${junkFolders.length} junk folder(s).`);

  for (const folder of junkFolders) {
    const unreadJunkMessages = await messenger.messages.query({
      folderId: folder.id,
      includeSubFolders: false,
      junk: true,
      read: false,
      messagesPerPage: 100,
      autoPaginationTimeout: 0
    });

    totalUpdated += await markUnreadMessagesAsRead(
      folder,
      unreadJunkMessages,
      "startup-scan"
    );
  }

  if (totalUpdated > 0) {
    logInfo(`Startup scan cleared ${totalUpdated} unread junk message(s).`);
  } else {
    await logDebug("Startup scan found no unread junk messages to clear.");
  }

  return totalUpdated;
}
