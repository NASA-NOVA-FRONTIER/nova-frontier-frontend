const loaded = new Set<string>();

// Albert Sans and JetBrains Mono cover Latin only. For Japanese, Chinese, Arabic and Hindi the
// Noto Sans family loads when the language is chosen, so English never pays for it; the system
// fonts named in i18n.css keep the text readable while it loads or if the request fails.
export const loadFont = (family: string | null): void => {
  if (family === null || typeof document === "undefined" || loaded.has(family)) return;
  loaded.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  document.head.appendChild(link);
};
