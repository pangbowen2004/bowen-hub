export const useMocks =
  import.meta.env.VITE_USE_MOCKS === "1" ||
  (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== "0");
