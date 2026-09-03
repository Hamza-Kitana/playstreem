import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  Clock3,
  Headphones,
  Mail,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/contexts/LocaleContext";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Al-Daboor" },
      {
        name: "description",
        content: "Al-Daboor",
      },
    ],
  }),
  component: ContactPage,
});

const CHANNEL_ICONS = [Mail, MessageCircle, Headphones];

const GUTTER = "px-4 sm:px-8 lg:px-12 xl:px-16";

function ContactPage() {
  const { messages } = useT();
  const copy = messages.pages.contact;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topicIndex, setTopicIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const topic = copy.topics[topicIndex] ?? copy.topics[0] ?? "";

  useEffect(() => {
    document.title = copy.metaTitle;
  }, [copy.metaTitle]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSent(true);
  };

  return (
    <div className="w-full space-y-16 sm:space-y-20">
      <section className={`w-full ${GUTTER}`}>
        <SectionHeading
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={copy.heroSubtitle}
        />

        <div className="grid w-full gap-4 md:grid-cols-3">
          {copy.channels.map((c, i) => {
            const Icon = CHANNEL_ICONS[i]!;
            return (
            <Reveal key={c.title} delay={i * 60}>
              <div className="glass panel-shine h-full rounded-3xl p-6 lg:p-8">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold">{c.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{c.body}</p>
                {i === 0 ? (
                  <a
                    href="mailto:hello@al-daboor.com"
                    className="mt-3 inline-block text-sm font-bold text-primary hover:underline"
                    dir="ltr"
                  >
                    hello@al-daboor.com
                  </a>
                ) : (
                  <p className="mt-3 text-sm font-bold text-foreground">{c.value}</p>
                )}
              </div>
            </Reveal>
            );
          })}
        </div>
      </section>

      <section className={`w-full ${GUTTER}`}>
        <div className="grid w-full gap-5 lg:grid-cols-2 xl:gap-8">
          <Reveal>
            <div className="glass panel-shine h-full space-y-5 rounded-3xl p-6 sm:p-8">
              <h3 className="text-xl font-extrabold">{copy.beforeTitle}</h3>
              <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
                <li className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  {copy.beforeConnect}
                </li>
                <li className="flex gap-3">
                  <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  {copy.beforeVerify}
                </li>
                <li className="flex gap-3">
                  <Clock3 className="mt-0.5 size-5 shrink-0 text-primary" />
                  {copy.beforeResponse}
                </li>
              </ul>

              <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm text-muted-foreground">
                {copy.learnPrompt}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="font-bold">
                    <Link to="/about">{copy.aboutCta}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="font-bold">
                    <Link to="/connect">{copy.connectCta}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <form onSubmit={submit} className="glass panel-shine h-full space-y-4 rounded-3xl p-6 sm:p-8">
              {sent ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <p className="text-2xl font-extrabold text-primary">{copy.sentTitle}</p>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                    {copy.sentBody.replace("{topic}", topic)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-7 font-bold"
                    onClick={() => {
                      setSent(false);
                      setName("");
                      setEmail("");
                      setMessage("");
                      setTopicIndex(0);
                    }}
                  >
                    {copy.sendAnother}
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-extrabold">{copy.formTitle}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.formSubtitle}</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold">{copy.nameLabel}</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={copy.namePlaceholder}
                      className="h-11"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold">{copy.emailLabel}</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="h-11"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold">{copy.topicLabel}</label>
                    <select
                      value={topicIndex}
                      onChange={(e) => setTopicIndex(Number(e.target.value))}
                      className="border-input bg-background focus-visible:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
                    >
                      {copy.topics.map((t, i) => (
                        <option key={t} value={i}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-bold">{copy.messageLabel}</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={copy.messagePlaceholder}
                      required
                      rows={6}
                      className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2"
                    />
                  </div>

                  <Button type="submit" className="h-12 w-full font-extrabold">
                    <Send className="size-4" />
                    {copy.submit}
                  </Button>
                </>
              )}
            </form>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
