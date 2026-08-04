import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { Loader2, Play, PlugZap, Radio, ClipboardPaste } from "lucide-react";
import { resolveKickChannel } from "@/lib/kick.functions";
import type { ChatStatus } from "@/hooks/useKickChat";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "al-daboor-kick-channel";

function cleanSlug(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?kick\.com\//i, "")
    .replace(/[?#].*$/, "")
    .replace(/\/.*$/, "")
    .replace(/^@/, "")
    .toLowerCase();
}

function looksLikeSlug(value: string) {
  return /^[a-z0-9_-]{2,60}$/i.test(value);
}

async function detectChannelSlug(search: string): Promise<{ slug: string; source: string } | null> {
  const params = new URLSearchParams(search);
  const fromUrl = params.get("channel") || params.get("kick");
  if (fromUrl) {
    const slug = cleanSlug(fromUrl);
    if (looksLikeSlug(slug)) return { slug, source: "الرابط" };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && looksLikeSlug(saved)) return { slug: saved, source: "آخر ربط" };
  } catch {
    /* ignore */
  }

  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      const slug = cleanSlug(text);
      if (looksLikeSlug(slug)) return { slug, source: "الحافظة" };
    }
  } catch {
    /* clipboard denied */
  }

  return null;
}

export default function ConnectPanel({
  status,
  channel,
  onConnect,
  onDemo,
  onStop,
}: {
  status: ChatStatus;
  channel: string | null;
  onConnect: (chatroomId: number, label: string) => void;
  onDemo: () => void;
  onStop: () => void;
}) {
  const resolve = useServerFn(resolveKickChannel);
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const connected = status === "live" || status === "demo";

  const connectOneTap = async () => {
    setErr(null);
    setHint(null);
    setLoading(true);
    try {
      const found = await detectChannelSlug(search);
      if (!found) {
        setErr(
          "ما لقينا قناة للربط. انسخ رابط بثك من كيك (مثل kick.com/اسمك) ثم اضغط الزر مرة ثانية — بدون كتابة.",
        );
        return;
      }

      const info = await resolve({ data: { slug: found.slug } });
      try {
        localStorage.setItem(STORAGE_KEY, info.slug);
      } catch {
        /* ignore */
      }
      setHint(`تم التعرف عبر ${found.source}`);
      onConnect(info.chatroomId, `kick.com/${info.slug}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر الاتصال بالقناة.");
    } finally {
      setLoading(false);
    }
  };

  // Auto one-tap when /connect?channel=slug is opened (great for OBS browser source).
  useEffect(() => {
    if (connected || loading) return;
    const params = new URLSearchParams(search);
    if (!(params.get("channel") || params.get("kick"))) return;
    void connectOneTap();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on search param arrival
  }, [search]);

  return (
    <div className="glass violet-ring rounded-3xl p-5 sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Radio className="size-5" />
        </span>
        <div>
          <h3 className="text-lg font-extrabold">اربط كيك بكبسة واحدةحدة</h3>
          <p className="text-sm text-muted-foreground">
            بدون ما تكتب شيء. انسخ رابط بثك من كيك واضغط الزر — أو افتح الصفحة برابط القناة.
          </p>
        </div>
      </div>

      {connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-primary/15 px-4 py-2 text-sm font-bold text-primary">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            متصل بـ {channel}
          </span>
          <Button variant="secondary" onClick={onStop}>
            قطع الاتصال
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Button
            onClick={connectOneTap}
            disabled={loading}
            className="h-16 w-full text-lg font-extrabold shadow-[0_0_40px_-8px_var(--neon)]"
          >
            {loading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                جاري الربط…
              </>
            ) : (
              <>
                <PlugZap className="size-5" />
                اربط كيك الآن
              </>
            )}
          </Button>

          <div className="grid gap-2 rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
            <p className="flex items-start gap-2 font-bold text-foreground">
              <ClipboardPaste className="mt-0.5 size-4 shrink-0 text-primary" />
              كيف بدون كتابة؟
            </p>
            <ol className="list-decimal space-y-1 pr-5 text-sm leading-6">
              <li>افتح صفحتك على كيك وانسخ الرابط.</li>
              <li>ارجع هنا واضغط «اربط كيك الآن».</li>
              <li>المرة الجاية الزر يربط نفس القناة تلقائياً.</li>
            </ol>
            <p className="pt-1 text-xs">
              للمستمرين على OBS: استخدم{" "}
              <span className="font-brand text-primary" dir="ltr">
                /connect?channel=اسمك
              </span>
            </p>
          </div>

          <Button variant="outline" className="h-12 w-full" onClick={onDemo}>
            <Play className="size-4" />
            تجربة بدون بث
          </Button>

          {hint ? <p className="text-sm font-semibold text-primary">{hint}</p> : null}
          {err ? <p className="text-sm font-semibold text-destructive">{err}</p> : null}
        </div>
      )}
    </div>
  );
}
