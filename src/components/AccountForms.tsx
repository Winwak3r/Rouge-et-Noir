"use client";

import { useActionState } from "react";
import { resendVerificationAction, setMyEmailRemindersAction, type FormState } from "@/app/actions/auth";

/** Bandeau « confirme ton adresse e-mail » avec renvoi du lien. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState>(resendVerificationAction, {});
  return (
    <div className="border-b border-amber-300 bg-amber-100 px-3 py-2 text-center text-xs text-amber-800 sm:text-sm">
      <form action={action} className="inline">
        Confirme ton adresse e-mail : un lien a été envoyé à <strong>{email}</strong>.{" "}
        <button disabled={pending} className="font-semibold underline underline-offset-2">
          {pending ? "Envoi…" : "Renvoyer le lien"}
        </button>
        {state.success && <span className="ml-2 font-medium">{state.success}</span>}
        {state.error && <span className="ml-2 font-medium text-red-700">{state.error}</span>}
      </form>
    </div>
  );
}

/** Case « rappel par e-mail 2 h avant le match ». */
export function EmailRemindersForm({ enabled, verified }: { enabled: boolean; verified: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setMyEmailRemindersAction, {});
  return (
    <form action={action} className="space-y-2 text-sm">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          name="emailReminders"
          defaultChecked={enabled}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="mt-0.5"
        />
        <span>Recevoir un e-mail de rappel 2 h avant chaque match si mon pronostic n’est pas saisi</span>
      </label>
      {!verified && <p className="text-xs text-amber-700">Les e-mails ne partent qu’une fois ton adresse confirmée.</p>}
      {pending && <p className="text-xs text-neutral-500">Enregistrement…</p>}
      {state.success && <p className="text-xs text-green-700">{state.success}</p>}
    </form>
  );
}
