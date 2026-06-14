let lastError: Error | null = null;

const capture = (error: any) => {
  lastError = error instanceof Error ? error : new Error(String(error));
};

if (typeof globalThis !== "undefined") {
  const g = globalThis as any;
  if (typeof g.addEventListener === "function") {
    g.addEventListener("error", (e: any) => capture(e.error ?? e));
    g.addEventListener("unhandledrejection", (e: any) => capture(e.reason));
  }
}

if (typeof process !== "undefined") {
  process.on("unhandledRejection", (reason) => capture(reason));
  process.on("uncaughtException", (error) => capture(error));
}

export function consumeLastCapturedError(): Error | null {
  const error = lastError;
  lastError = null;
  return error;
}
