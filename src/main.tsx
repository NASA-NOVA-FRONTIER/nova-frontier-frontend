import "@/index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { initI18n } from "@/i18n";

const root = document.getElementById("root");
if (root === null) throw new Error("Missing #root element");

// The language catalog loads first, so the first paint is already in the visitor's language.
void initI18n().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
