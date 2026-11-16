import { lazy, Suspense } from "react";

import { useLanguage } from "@/i18n";
import { usePathname } from "@/lib/navigation";

// Pages load on demand: the landing page must not pull in Cesium (the explorer) or vice versa.
const ExplorerPage = lazy(async () => ({
  default: (await import("@/pages/explorer/ExplorerPage")).ExplorerPage,
}));
const LandingPage = lazy(async () => ({
  default: (await import("@/pages/landing/LandingPage")).LandingPage,
}));
const AboutPage = lazy(async () => ({
  default: (await import("@/pages/about/AboutPage")).AboutPage,
}));
const CasesPage = lazy(async () => ({
  default: (await import("@/pages/cases/CasesPage")).CasesPage,
}));
const MethodPage = lazy(async () => ({
  default: (await import("@/pages/method/MethodPage")).MethodPage,
}));
const LearnPage = lazy(async () => ({
  default: (await import("@/pages/learn/LearnPage")).LearnPage,
}));
const ReportPage = lazy(async () => ({
  default: (await import("@/pages/report/ReportPage")).ReportPage,
}));

// E2E stub builds only: Vite inlines the flag, so production drops this branch and its chunk
// (`pnpm check:no-stub` fails the build if it ever ships).
const InfoTipHarness =
  import.meta.env.VITE_E2E_GLOBE === "stub"
    ? lazy(async () => ({
        default: (await import("@/pages/e2e/InfoTipHarness")).InfoTipHarness,
      }))
    : null;

// Links shared before the landing page existed point at /?frame=..., so they still open the explorer.
const isLegacyExplorerLink = (): boolean =>
  new URLSearchParams(window.location.search).has("frame");

const CurrentPage = ({ pathname }: { pathname: string }) => {
  if (InfoTipHarness && pathname === "/__e2e/infotip") return <InfoTipHarness />;
  if (pathname === "/explore" || isLegacyExplorerLink()) return <ExplorerPage />;
  if (pathname === "/cases") return <CasesPage />;
  if (pathname === "/method") return <MethodPage />;
  if (pathname === "/learn") return <LearnPage />;
  if (pathname === "/about") return <AboutPage />;
  if (pathname === "/report") return <ReportPage />;
  return <LandingPage />;
};

export const App = () => {
  const pathname = usePathname();
  // Subscribing here re-renders every page (none is memoized) when the language changes.
  useLanguage();
  return (
    <Suspense fallback={<div className="h-dvh bg-[#04070e]" aria-busy="true" />}>
      <CurrentPage pathname={pathname} />
    </Suspense>
  );
};
