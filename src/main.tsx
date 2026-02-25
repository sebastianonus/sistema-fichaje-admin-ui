
import { createRoot } from "react-dom/client";
import App from "./app/App";
import WorkerApp from "./app/WorkerApp";
import "./styles/index.css";

const isWorkerMode = window.location.pathname.startsWith("/worker");

createRoot(document.getElementById("root")!).render(
  isWorkerMode ? <WorkerApp /> : <App />,
);
  
