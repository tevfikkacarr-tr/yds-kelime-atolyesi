"use client";

import FatalScreen from "@/components/FatalScreen";
import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="tr">
      <body>
        <FatalScreen error={error} onRetry={reset} />
      </body>
    </html>
  );
}
