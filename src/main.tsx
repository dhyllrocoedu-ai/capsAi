import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "@/app/routes";
import { useAuthStore } from "@/lib/stores/authStore";
import "@/index.css";

// Restore persisted session before first render so guards see it synchronously.
useAuthStore.getState().initialize();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
