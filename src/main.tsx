
import { createRoot } from "react-dom/client";
import App from "./app/App";
import WorkerApp from "./app/WorkerApp";
import "./styles/index.css";

const forceWorkerMode = (import.meta.env.VITE_FORCE_WORKER_MODE as string | undefined) === "true";
const isWorkerMode = forceWorkerMode || window.location.pathname.startsWith("/worker");

createRoot(document.getElementById("root")!).render(
  isWorkerMode ? <WorkerApp /> : <App />,
);
  
