// Relays TikTok LIVE events from TikTok tabs to every open Al-Daboor tab.

const sitePorts = new Set();
/** Latest status per TikTok tab id: { channel, at }. */
const liveTabs = new Map();
let forwarded = 0;

function broadcast(message) {
  for (const port of sitePorts) {
    try {
      port.postMessage(message);
    } catch {
      sitePorts.delete(port);
    }
  }
}

function statusSnapshot() {
  const now = Date.now();
  const live = [];
  for (const [tabId, s] of liveTabs) {
    if (now - s.at < 20000) live.push({ tabId, channel: s.channel });
    else liveTabs.delete(tabId);
  }
  return { type: "status", tabs: live };
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "al-daboor-site") return;
  sitePorts.add(port);
  port.postMessage(statusSnapshot());
  port.onDisconnect.addListener(() => sitePorts.delete(port));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "popup-info") {
    sendResponse({ sites: sitePorts.size, forwarded, ...statusSnapshot() });
    return;
  }
  const tabId = sender.tab?.id;
  if (tabId == null) return;

  if (message?.type === "tiktok-status") {
    if (message.channel) liveTabs.set(tabId, { channel: message.channel, at: Date.now() });
    else liveTabs.delete(tabId);
    broadcast(statusSnapshot());
    return;
  }
  if (message?.type === "tiktok-events" && Array.isArray(message.events)) {
    const channel = liveTabs.get(tabId)?.channel ?? message.channel ?? null;
    forwarded += message.events.length;
    broadcast({ type: "events", channel, events: message.events });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (liveTabs.delete(tabId)) broadcast(statusSnapshot());
});
