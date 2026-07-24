import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n"; // import i18n setup
import { initializePlugins } from "./plugins/init";

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason.message === 'string' && event.reason.message.includes('WebSocket closed without opened')) {
    event.preventDefault();
  }
});

// Pre-initialize plugins
initializePlugins().catch(console.error);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

