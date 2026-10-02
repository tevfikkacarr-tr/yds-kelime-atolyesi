"use client";

import FatalScreen from "@/components/FatalScreen";

export default function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return <FatalScreen error={error} onRetry={reset} />;
}
