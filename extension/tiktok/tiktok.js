// Runs on tiktok.com: reads LIVE chat rows from the page and forwards them to the background.

(() => {
  const LIVE_PATH = /^\/@([^/?#]+)\/live/;
  const ROW_SELECTOR = [
    '[data-e2e="chat-message"]',
    '[data-e2e="gift-message"]',
    '[data-e2e="chat-gift-message"]',
  ].join(",");
  const NAME_SELECTOR = '[data-e2e="message-owner-name"],[data-e2e="chat-message-owner-name"]';
  const GIFT_SELECTOR = '[data-e2e="gift-message"],[data-e2e="chat-gift-message"]';
  const GIFT_TEXT =
    /(?:^|\s)(?:sent|send|أرسل|ارسل|أهدى|اهدى|envió|a envoyé|gönderdi)\s+(.+?)(?:\s*[x×]\s*(\d+))?$/i;
  const SEEN_ATTR = "data-ald-seen";

  let channel = null;
  let observer = null;
  let queue = [];
  let flushTimer = null;
  let counter = 0;
  let forwarded = 0;

  function send(message) {
    try {
      chrome.runtime.sendMessage(message);
    } catch {
      // Extension reloaded; this content script is orphaned.
      stop();
    }
  }

  function liveChannel() {
    const m = location.pathname.match(LIVE_PATH);
    return m ? decodeURIComponent(m[1]) : null;
  }

  /** Visible text with emoji images replaced by their alt text. */
  function readText(node) {
    let out = "";
    const walk = (n) => {
      if (n.nodeType === Node.TEXT_NODE) {
        out += n.nodeValue;
        return;
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      if (n.tagName === "IMG") {
        const alt = n.getAttribute("alt");
        if (alt && alt.length <= 24) out += alt;
        return;
      }
      for (const child of n.childNodes) walk(child);
      if (/^(DIV|P|LI)$/.test(n.tagName)) out += " ";
    };
    walk(node);
    return out.replace(/\s+/g, " ").trim();
  }

  function parseRow(row) {
    const nameEl = row.querySelector(NAME_SELECTOR);
    const user = nameEl ? readText(nameEl) : "";
    if (!user) return null;

    const link = row.querySelector('a[href*="/@"]');
    const userId = link?.getAttribute("href")?.match(/\/@([^/?#]+)/)?.[1] ?? null;

    let text = readText(row);
    const at = text.indexOf(user);
    if (at !== -1) text = text.slice(0, at) + text.slice(at + user.length);
    text = text.replace(/^[\s:：·-]+/, "").trim();

    const giftMatch = text.match(GIFT_TEXT);
    if (row.matches(GIFT_SELECTOR) || giftMatch) {
      const giftImg = [...row.querySelectorAll("img")].find((img) => !nameEl?.contains(img));
      return {
        type: "gift",
        id: `tt-${Date.now()}-${++counter}`,
        user,
        userId,
        giftName: (giftMatch?.[1] ?? text).trim().slice(0, 60) || "Gift",
        count: Math.max(1, Number(giftMatch?.[2] ?? 1) || 1),
        image: giftImg?.src?.startsWith("https://") ? giftImg.src : null,
        at: Date.now(),
      };
    }
    if (!text) return null;
    return {
      type: "chat",
      id: `tt-${Date.now()}-${++counter}`,
      user,
      userId,
      text: text.slice(0, 500),
      at: Date.now(),
    };
  }

  function flush() {
    flushTimer = null;
    if (queue.length === 0) return;
    const events = queue;
    queue = [];
    forwarded += events.length;
    send({ type: "tiktok-events", channel, events });
  }

  function handleRow(row) {
    if (row.hasAttribute(SEEN_ATTR)) return;
    row.setAttribute(SEEN_ATTR, "1");
    const event = parseRow(row);
    if (!event) return;
    queue.push(event);
    if (!flushTimer) flushTimer = setTimeout(flush, 250);
  }

  function scan(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.matches(ROW_SELECTOR)) handleRow(node);
    for (const row of node.querySelectorAll(ROW_SELECTOR)) handleRow(row);
  }

  function start() {
    // Skip the backlog already on screen; only forward rows that arrive from now on.
    for (const row of document.querySelectorAll(ROW_SELECTOR)) row.setAttribute(SEEN_ATTR, "1");
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) for (const node of m.addedNodes) scan(node);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    queue = [];
  }

  function heartbeat() {
    const next = liveChannel();
    if (next !== channel) {
      stop();
      channel = next;
      if (channel) start();
    }
    send({ type: "tiktok-status", channel });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "diagnose") return;
    const counts = {};
    for (const el of document.querySelectorAll("[data-e2e]")) {
      const key = el.getAttribute("data-e2e");
      counts[key] = (counts[key] ?? 0) + 1;
    }
    const firstRow = document.querySelector(ROW_SELECTOR);
    const sampleRoot = firstRow?.parentElement ?? document.querySelector('[class*="Chat" i]');
    sendResponse({
      url: location.href,
      channel,
      forwarded,
      rowsFound: document.querySelectorAll(ROW_SELECTOR).length,
      dataE2e: counts,
      sample: sampleRoot ? sampleRoot.outerHTML.slice(0, 20000) : null,
    });
  });

  window.addEventListener("pagehide", () => send({ type: "tiktok-status", channel: null }));
  heartbeat();
  setInterval(heartbeat, 3000);
})();
