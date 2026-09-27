// Runs on Al-Daboor pages: bridges the extension background to the page via postMessage.

(() => {
  const VERSION = chrome.runtime.getManifest().version;
  const TO_PAGE = "al-daboor-tiktok-ext";
  const FROM_PAGE = "al-daboor-site";
  let port = null;

  function toPage(payload) {
    window.postMessage({ source: TO_PAGE, version: VERSION, ...payload }, location.origin);
  }

  function connect() {
    try {
      port = chrome.runtime.connect({ name: "al-daboor-site" });
    } catch {
      // Extension was reloaded or removed; this content script is orphaned.
      return;
    }
    port.onMessage.addListener((message) => toPage(message));
    port.onDisconnect.addListener(() => {
      port = null;
      // The service worker restarts after being idle; reconnect shortly.
      setTimeout(connect, 1000);
    });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== FROM_PAGE) return;
    if (event.data.type === "ping") toPage({ type: "hello" });
  });

  connect();
  toPage({ type: "hello" });
})();
