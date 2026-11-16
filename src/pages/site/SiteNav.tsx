import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/i18n";
import { APP_NAME } from "@/lib/appName";
import { BrandMark } from "@/lib/BrandMark";
import { Link } from "@/lib/Link";

import { tr } from "@/i18n/translate";
import { localized } from "@/i18n/localized";
export type SitePage = "landing" | "cases" | "method" | "learn" | "about";

type SiteNavProps = {
  page: SitePage;
};

const PAGE_LINKS: { page: SitePage; to: string; label: string; testId: string }[] = localized([
  { page: "cases", to: "/cases", label: "Cases", testId: "nav-cases" },
  { page: "method", to: "/method", label: "Method", testId: "nav-method" },
  { page: "learn", to: "/learn", label: "Learn", testId: "nav-learn" },
  { page: "about", to: "/about", label: "About", testId: "nav-about" },
]);

const LINKS_ID = "s-nav-links";

// Over the landing's planet the bar is clear; on text pages it is glass so copy can scroll under it.
// Phones fold the page links behind a Menu button (issue #61) so the explorer pill keeps its room.
export const SiteNav = ({ page }: SiteNavProps) => {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && navRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const classes = ["s-nav", page === "landing" ? "" : "s-nav--glass", open ? "s-nav--open" : ""];

  return (
    <nav ref={navRef} className={classes.filter(Boolean).join(" ")} aria-label={tr("Main")}>
      <Link to="/" className="s-nav__mark">
        <BrandMark size={24} />
        {APP_NAME}
      </Link>
      <div className="s-nav__end">
        <button
          ref={buttonRef}
          type="button"
          className="s-nav__menu"
          aria-expanded={open}
          aria-controls={LINKS_ID}
          data-testid="nav-menu"
          onClick={() => setOpen((was) => !was)}
        >
          {tr("Menu")}
        </button>
        <div id={LINKS_ID} className="s-nav__links" data-testid="nav-links">
          {PAGE_LINKS.map(({ page: target, to, label, testId }) =>
            target === page ? (
              <a
                key={to}
                href={to}
                className="s-nav__link"
                aria-current="page"
                data-testid={testId}
              >
                {label}
              </a>
            ) : (
              <Link key={to} to={to} className="s-nav__link" testId={testId}>
                {label}
              </Link>
            ),
          )}
        </div>
        <LanguageSwitcher variant="site" />
        <Link to="/explore" className="s-nav__pill" testId="nav-explore">
          {/* Phones keep the short label so the mark, Menu and the pill share 390 px. */}
          <span className="s-nav__pill-long">{tr("Open the explorer")}</span>
          <span className="s-nav__pill-short">{tr("Explore")}</span>
        </Link>
      </div>
    </nav>
  );
};
