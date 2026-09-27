const $ = (id) => document.getElementById(id);

function mark(el, ok, text) {
  el.textContent = text;
  el.className = ok ? "ok" : "bad";
}

chrome.runtime.sendMessage({ type: "popup-info" }, (info) => {
  if (!info) return;
  const channels = info.tabs.map((t) => `@${t.channel}`).join("، ");
  mark($("tiktok"), info.tabs.length > 0, channels || "لا");
  mark($("site"), info.sites > 0, info.sites > 0 ? "نعم" : "لا");
  $("count").textContent = String(info.forwarded);
});

$("diagnose").addEventListener("click", async () => {
  const note = $("note");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url?.startsWith("https://www.tiktok.com/")) {
    note.textContent = "افتح تاب بث تيكتوك أول، وبعدين اكبس الزر.";
    return;
  }
  chrome.tabs.sendMessage(tab.id, { type: "diagnose" }, async (report) => {
    if (chrome.runtime.lastError || !report) {
      note.textContent = "حدّث صفحة تيكتوك وجرب مرة تانية.";
      return;
    }
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    note.textContent = `انتسخ التقرير (${report.rowsFound} رسالة لقيناها). ابعته للمطوّر.`;
  });
});
