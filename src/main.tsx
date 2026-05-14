import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./app/App.tsx";
import "./styles/index.css";
import { AuthProvider } from "./context/AuthContext.tsx";

// Initialize Sentry for the Frontend
Sentry.init({
  dsn: "https://704df4746a2e0f9e4bfa7d096b83726d@o4511388333441024.ingest.us.sentry.io/4511388341108736",
  
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // We recommend adjusting this value in production (e.g., 0.1 for 10%)
  tracesSampleRate: 1.0,
  
  // Capture Replay for 10% of all sessions, plus for 100% of sessions with an error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Integrations are optional but highly recommended for full visibility
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Masking text helps protect PII
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

const container = document.getElementById("root");
if (!container) throw new Error("Failed to find the root element");
const root = createRoot(container);

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
