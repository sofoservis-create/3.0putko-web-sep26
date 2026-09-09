"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../_lib/auth-actions";

/**
 * The only Client Component in the account area.
 *
 * It exists for one reason: showing the server's error message without
 * losing what the user typed. The credentials themselves never live in
 * client state — the form posts straight to a Server Action, so the
 * password is not held in a React value, not in a controlled input, and not
 * in any store a browser extension or an injected script can read.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      {/* Empty when the user came to /prihlasenie directly, so the action
          picks the right home for their role rather than this form
          guessing before anyone is authenticated. */}
      <input type="hidden" name="next" value={next ?? ""} />

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Heslo
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2.5 text-ink outline-none focus:border-brand"
        />
      </div>

      {/* role="alert" so a screen reader announces the failure instead of
          leaving a blind user staring at a form that silently did nothing. */}
      {state.error ? (
        <p role="alert" className="rounded-control bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-control bg-brand px-4 py-2.5 font-ui font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Prihlasujem…" : "Prihlásiť sa"}
      </button>
    </form>
  );
}
