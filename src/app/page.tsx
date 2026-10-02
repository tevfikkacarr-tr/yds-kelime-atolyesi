import AppShell from "@/components/AppShell";
import ErrorBoundary from "@/components/ErrorBoundary";

// Sunucu bileşeni: tarayıcı API'si kullanmaz. Öğrenme motoru yalnızca istemcide (AppShell) yüklenir.
export default function Page() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
