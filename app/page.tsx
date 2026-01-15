import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to News</h1>
        <p className="text-muted-foreground mb-8">
          A modern news platform built with Next.js
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-border rounded-md hover:bg-accent"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
