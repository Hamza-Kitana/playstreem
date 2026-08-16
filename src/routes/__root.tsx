import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { KickChatProvider } from "@/contexts/KickChatContext";
import { GuideProvider, useGuide } from "@/contexts/GuideContext";
import AppShell from "@/components/AppShell";
import BootSplash from "@/components/BootSplash";
import LoadingScreen from "@/components/LoadingScreen";
import WelcomeGuide from "@/components/WelcomeGuide";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">الصفحة غير موجودة</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          الصفحة اللي تبحث عنها غير موجودة أو تم نقلها.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass max-w-md rounded-3xl border border-primary/20 px-8 py-10 text-center">
        <p className="font-brand text-lg font-bold text-primary">Al-Daboor</p>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
          الصفحة ما تحملتش
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          صار خطأ من جهتنا. جرّب التحديث أو ارجع للرئيسية.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            حاول مرة ثانية
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Al-Daboor — ألعاب تفاعلية مع شات كيك" },
      {
        name: "description",
        content: "Al-Daboor: ألعاب تفاعلية للبث يقودها شات كيك — أسئلة، كرسي، تصويت، وتقييم.",
      },
      { property: "og:title", content: "Al-Daboor — ألعاب تفاعلية مع شات كيك" },
      {
        property: "og:description",
        content: "اربط بثّك على كيك وشغّل ألعاباً تفاعلية مع Al-Daboor.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/favicon.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:image", content: "/favicon.png" },
    ],
    links: [
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Space+Grotesk:wght@500;600;700&family=Tajawal:wght@400;500;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  pendingComponent: () => <LoadingScreen fullscreen={false} label="تحميل الصفحة…" />,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isOverlay = pathname === "/quiz/overlay";

  return (
    <QueryClientProvider client={queryClient}>
      <KickChatProvider>
        <GuideProvider>
          <BootWithGuide>
            <AppShell>
              <Outlet />
            </AppShell>
          </BootWithGuide>
          {!isOverlay ? <WelcomeGuide /> : null}
        </GuideProvider>
      </KickChatProvider>
    </QueryClientProvider>
  );
}

function BootWithGuide({ children }: { children: ReactNode }) {
  const { offerGuideAfterBoot } = useGuide();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/quiz/overlay") return <>{children}</>;
  return <BootSplash onFinished={offerGuideAfterBoot}>{children}</BootSplash>;
}
