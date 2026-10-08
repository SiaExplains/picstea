"use client";

import { useEffect } from "react";
import { createLogger, describeError } from "@/lib/logging/logger";

const logger = createLogger("app");

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    logger.error("route error", { ...describeError(error), digest: error.digest });
  }, [error]);

  return (
    <main style={{ maxWidth: 560, margin: "15vh auto", padding: "0 16px" }}>
      <h1>Something went wrong</h1>
      <p>
        This page hit an unexpected error. Your images stay on your device and were not sent
        anywhere.
      </p>
      <button type="button" onClick={() => retry()}>
        Try again
      </button>
    </main>
  );
}
