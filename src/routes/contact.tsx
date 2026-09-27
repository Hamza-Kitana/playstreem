import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowUpRight, Globe } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
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

const SITE_URL = "https://hamza-kitana.vercel.app/";
const SITE_LABEL = "hamza-kitana.vercel.app";

const GUTTER = "px-4 sm:px-8 lg:px-12 xl:px-16";

function ContactPage() {
  const { messages } = useT();
  const copy = messages.pages.contact;

  useEffect(() => {
    document.title = copy.metaTitle;
  }, [copy.metaTitle]);

  return (
    <div className="w-full space-y-16 sm:space-y-20">
      <section className={`w-full ${GUTTER}`}>
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />

        <Reveal>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-strong panel-shine group relative mx-auto block max-w-2xl overflow-hidden rounded-3xl border border-primary/25 p-8 text-center shadow-[0_30px_80px_-40px_var(--neon)] transition-[transform,border-color] duration-500 hover:-translate-y-1 hover:border-primary/50 sm:p-12"
          >
            <div
              className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
              style={{ background: "var(--neon)" }}
            />
            <span
              className="relative mx-auto grid size-16 place-items-center rounded-2xl text-white shadow-[0_20px_50px_-20px_var(--neon)]"
              style={{
                background:
                  "linear-gradient(135deg, color-mix(in oklab, var(--neon) 92%, white 8%), color-mix(in oklab, var(--neon-3) 92%, white 8%))",
              }}
            >
              <Globe className="size-7" />
            </span>
            <h3 className="font-brand relative mt-6 text-2xl font-extrabold sm:text-3xl" dir="ltr">
              {copy.siteTitle}
            </h3>
            <p className="relative mt-1.5 text-sm font-bold text-primary">{copy.siteRole}</p>
            <p className="relative mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
              {copy.siteBody}
            </p>
            <p
              className="relative mt-5 inline-block rounded-xl bg-black/35 px-3 py-1.5 text-sm font-bold text-white/80"
              dir="ltr"
            >
              {SITE_LABEL}
            </p>
            <div className="relative mt-6">
              <Button asChild className="h-12 gap-2 rounded-2xl px-7 text-base font-extrabold">
                <span>
                  {copy.siteCta}
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Button>
            </div>
          </a>
        </Reveal>
      </section>
    </div>
  );
}
