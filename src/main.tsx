
import { createRoot } from "react-dom/client";
import App from "./app/App";
import WorkerApp from "./app/WorkerApp";
import "./styles/index.css";

function enableServiceWorkerUpdates() {
  if (!("serviceWorker" in navigator)) return;

  let hasController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hasController) {
      hasController = true;
      return;
    }
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const checkForUpdate = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    } catch {
      // A failed update check must not block the portal.
    }
  };

  window.addEventListener("load", () => {
    void checkForUpdate();
    window.setInterval(checkForUpdate, 5 * 60 * 1000);
  });
  window.addEventListener("focus", () => void checkForUpdate());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkForUpdate();
  });
}

enableServiceWorkerUpdates();

const forceWorkerMode = (import.meta.env.VITE_FORCE_WORKER_MODE as string | undefined) === "true";
const hostname = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
const isWorkerDomain = hostname.includes("worker");
const isWorkerMode = forceWorkerMode || isWorkerDomain || window.location.pathname.startsWith("/worker");

createRoot(document.getElementById("root")!).render(
  isWorkerMode ? <WorkerApp /> : <App />,
);
  
