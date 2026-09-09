import { redirect } from "next/navigation";
import type { Route } from "next";
import { getSession } from "../_lib/session";
import { LoginForm } from "./login-form";
import { SiteHeader } from "../_components/site-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prihlásenie" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Already signed in — send them on rather than showing a login form to
  // someone who is logged in, which is a small thing that reads as broken.
  const session = await getSession();
  if (session) redirect((session.activeMode === "host" ? "/host" : "/ucet") as Route);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
          Prihlásenie
        </h1>
        <p className="mt-2 text-ink-soft">
          Jeden účet na cestovanie aj na prenajímanie.
        </p>
        <LoginForm next={next} />
      </main>
    </>
  );
}
