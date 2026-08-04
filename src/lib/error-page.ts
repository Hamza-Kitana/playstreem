export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>Al-Daboor — حصل خطأ</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.6 "Tajawal", system-ui, sans-serif; background: #0a1214; color: #e8f7f0; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; border: 1px solid rgba(61,255,176,.2); border-radius: 1.25rem; background: rgba(18,28,30,.85); }
      .brand { font-family: "Space Grotesk", system-ui, sans-serif; color: #3dffb0; font-weight: 700; font-size: 1.1rem; margin-bottom: .75rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #9bb5ab; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.55rem 1.1rem; border-radius: 0.75rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #3dffb0; color: #072018; font-weight: 700; }
      .secondary { background: transparent; color: #e8f7f0; border-color: rgba(255,255,255,.15); }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="brand">Al-Daboor</div>
      <h1>الصفحة ما تحملتش</h1>
      <p>صار خطأ من جهتنا. جرّب التحديث أو ارجع للرئيسية.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">حاول مرة ثانية</button>
        <a class="secondary" href="/">العودة للرئيسية</a>
      </div>
    </div>
  </body>
</html>`;
}
