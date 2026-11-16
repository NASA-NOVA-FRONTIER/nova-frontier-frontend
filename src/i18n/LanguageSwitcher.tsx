import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { tr } from "@/i18n/translate";
import { useLanguage } from "@/i18n/useLanguage";

type LanguageSwitcherProps = {
  // Which bar hosts it, so the button matches its neighbours.
  variant: "explorer" | "site";
};

const BUTTON_CLASS = { explorer: "x-pill lang__button", site: "s-nav__link lang__button" } as const;

// Two letters for the current language; a click opens the other languages in their own script.
export const LanguageSwitcher = ({ variant }: LanguageSwitcherProps) => {
  const { language, others, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const changed = useRef(false);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open) itemsRef.current[0]?.focus();
  }, [open]);

  // Screen readers hear the switch in the new language.
  useEffect(() => {
    if (!changed.current) return;
    setAnnouncement(tr("Language changed to {{name}}", { name: language.nativeName }));
  }, [language.code, language.nativeName]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = itemsRef.current.filter((item): item is HTMLButtonElement => item !== null);
    const at = items.findIndex((item) => item === document.activeElement);
    const to = {
      ArrowDown: (at + 1) % items.length,
      ArrowUp: (at - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key];
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (to !== undefined) {
      event.preventDefault();
      items[to]?.focus();
    }
  };

  return (
    <div className="lang" ref={rootRef} data-testid="language-switcher">
      <button
        ref={buttonRef}
        type="button"
        className={BUTTON_CLASS[variant]}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tr("Language: {{name}}", { name: language.nativeName })}
        title={tr("Language: {{name}}", { name: language.nativeName })}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        data-testid="language-button"
      >
        {language.short}
      </button>
      {open && (
        <div
          className="lang__menu"
          role="menu"
          tabIndex={-1}
          aria-label={tr("Languages")}
          onKeyDown={move}
          data-testid="language-menu"
        >
          {others.map((item, index) => (
            <button
              key={item.code}
              ref={(node) => {
                itemsRef.current[index] = node;
              }}
              type="button"
              role="menuitem"
              className="lang__item"
              lang={item.htmlLang}
              dir={item.dir}
              onClick={() => {
                changed.current = true;
                void setLanguage(item.code).then(close);
              }}
              data-testid={`language-option-${item.code}`}
            >
              <span>{item.nativeName}</span>
              <span className="lang__code" aria-hidden="true">
                {item.short}
              </span>
            </button>
          ))}
        </div>
      )}
      <span className="lang__live" role="status" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
};
