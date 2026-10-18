import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ maxWidth: 560, margin: "15vh auto", padding: "0 16px" }}>
      <h1>Page not found</h1>
      <p>
        <Link href="/">Open the Picstea editor</Link>.
      </p>
    </main>
  );
}
