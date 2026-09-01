import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { ClipboardPaste, Loader2, PlugZap, Radio } from "lucide-react";
import { resolveKickChannel } from "@/lib/kick.functions";
import { loadKickSession, loadLegacyKickSlug, saveKickSession } from "@/lib/kick-session";
import type { ChatStatus } from "@/hooks/useKickChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

export default function ConnectPanel({
  status,
  channel,
  onConnect,
  onStop,
}: {
  status: ChatStatus;
  channel: string | null;
  onConnect: (chatroomId: number, label: string, slug?: string, channelId?: number) => void;
  onStop: () => void;
}) {
  const resolve = useServerFn(resolveKickChannel);
  const search = useRouterState({ select: (s) => s.location.searchStr });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const connected = status === "live";
  const busy = loading || status === "connecting";

  // Prefill from URL (?channel=) or last saved channel.
  useEffect(() => {
    if (prefilled) return;
    const params = new URLSearchParams(search);
    const fromUrl = params.get("channel") || params.get("kick");
    if (fromUrl) {
      setInput(cleanSlug(fromUrl));
      setPrefilled(true);
      return;
    }
    const session = loadKickSession();
    if (session) {
      setInput(session.slug);
      setPrefilled(true);
      return;
    }
    const legacy = loadLegacyKickSlug();
    if (legacy) setInput(legacy);
    setPrefilled(true);
  }, [search, prefilled]);

  const connectWith = async (raw: string, source: string) => {
    setErr(null);
    setHint(null);

    const slug = cleanSlug(raw);
    if (!looksLikeSlug(slug)) {
      setErr("حط رابط البث أو اسم القناة، مثل kick.com/اسمك أو اسمك فقط.");
      return;
    }

    setLoading(true);
    try {
      const info = await resolve({ data: { slug } });
      saveKickSession({ slug: info.slug, chatroomId: info.chatroomId, channelId: info.channelId });
      setInput(info.slug);
      setHint(`تم الربط عبر ${source}`);
      onConnect(info.chatroomId, `kick.com/${info.slug}`, info.slug, info.channelId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر الاتصال بالقناة.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void connectWith(input, "الرابط المدخل");
  };

  const pasteFromClipboard = async () => {
    setErr(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text?.trim()) {
        setErr("الحافظة فاضية. انسخ رابط البث من كيك أول.");
        return;
      }
      setInput(text.trim());
      await connectWith(text, "الحافظة");
    } catch {
      setErr("ما قدرنا نقرأ الحافظة. الصق الرابط يدويًا في الحقل.");
    }
  };

  // Auto-connect when opened with /connect?channel=slug (OBS-friendly).
  useEffect(() => {
    if (connected || busy) return;
    const params = new URLSearchParams(search);
    const fromUrl = params.get("channel") || params.get("kick");
    if (!fromUrl) return;
    void connectWith(fromUrl, "رابط الصفحة");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once when channel search arrives
  }, [search]);

  return (
    <div className="glass violet-ring rounded-3xl p-5 sm:p-7">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Radio className="size-5" />
        </span>
        <div>
          <h3 className="text-lg font-extrabold">اربط بث كيك</h3>
          <p className="text-sm text-muted-foreground">
            حط رابط قناتك أو اسمها، بعدين اضغط ربط. الربط يرجع تلقائياً بعد التحديث.
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
          {status === "connecting" ? (
            <p className="flex items-center gap-2 text-sm font-bold text-primary">
              <Loader2 className="size-4 animate-spin" />
              جاري استعادة الربط…
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block space-y-2">
              <span className="text-sm font-bold text-foreground">رابط البث أو اسم القناة</span>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="kick.com/اسمك أو اسم القناة"
                dir="ltr"
                className="h-12 rounded-2xl text-base font-semibold placeholder:font-normal placeholder:text-muted-foreground"
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                disabled={busy || !input.trim()}
                className="h-12 flex-1 text-base font-extrabold shadow-[0_0_40px_-8px_var(--neon)]"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    جاري الربط…
                  </>
                ) : (
                  <>
                    <PlugZap className="size-5" />
                    ربط القناة
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void pasteFromClipboard()}
                className="h-12 font-bold sm:w-auto"
              >
                <ClipboardPaste className="size-4" />
                لصق وربط
              </Button>
            </div>
          </form>

          <p className="text-xs leading-6 text-muted-foreground">
            مثال:{" "}
            <span className="font-brand text-primary" dir="ltr">
              https://kick.com/salahat8
            </span>{" "}
            أو الاسم فقط. للبث المستمر من OBS استخدم{" "}
            <span className="font-brand text-primary" dir="ltr">
              /connect?channel=اسمك
            </span>
          </p>

          {hint ? <p className="text-sm font-semibold text-primary">{hint}</p> : null}
          {err ? <p className="text-sm font-semibold text-destructive">{err}</p> : null}
        </div>
      )}
    </div>
  );
}
