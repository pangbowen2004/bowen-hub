import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useMocks } from "./lib/environment";
import { router } from "./router";
import "./styles/global.css";

async function start() {
  if (useMocks) {
    const { worker } = await import("./mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  }
  const element = document.getElementById("root");
  if (!element) throw new Error("缺少根容器");
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  createRoot(element).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
void start();
