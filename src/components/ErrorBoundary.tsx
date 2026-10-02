"use client";

import { Component, type ReactNode } from "react";
import FatalScreen from "@/components/FatalScreen";

/** React tarafındaki render hatalarını yakalar; motor içindeki hatalar motorun kendi hata ekranıyla yakalanır. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown) {
    console.error("[YDS] render error", error);
  }
  render() {
    if (this.state.error) return <FatalScreen error={this.state.error} onRetry={() => window.location.reload()} />;
    return this.props.children;
  }
}
