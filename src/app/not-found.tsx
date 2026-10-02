import Link from "next/link";

export default function NotFound() {
  return (
    <div className="fatal-screen">
      <h1>Sayfa bulunamadı</h1>
      <p>
        <Link href="/">Ana sayfaya dön</Link>
      </p>
    </div>
  );
}
