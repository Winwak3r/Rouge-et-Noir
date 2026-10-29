"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  forgotPasswordAction,
  loginAction,
  registerAction,
  requestEmailChangeAction,
  resendVerificationByEmailAction,
  resetPasswordAction,
  type FormState,
} from "@/app/actions/auth";

const initial: FormState = {};

function Submit({ children }: { children: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending} aria-busy={pending}>
      {pending ? "Un instant…" : children}
    </button>
  );
}

function Message({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
        {state.success}
      </p>
    );
  return null;
}

function Field(props: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}) {
  const id = `f-${props.name}`;
  const isPassword = props.type === "password";
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="label">
        {props.label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={props.name}
          type={isPassword && visible ? "text" : (props.type ?? "text")}
          autoComplete={props.autoComplete}
          required={props.required ?? true}
          className={`input ${isPassword ? "pr-11" : ""}`}
          aria-describedby={props.hint ? `${id}-hint` : undefined}
        />
        {isPassword && (
          // Œil en bout de champ : afficher / masquer le mot de passe
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-neutral-500 hover:text-noir focus-visible:outline-2 focus-visible:outline-noir"
          >
            <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {visible && <path d="M3 3l18 18" />}
            </svg>
          </button>
        )}
      </div>
      {props.hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-neutral-500">
          {props.hint}
        </p>
      )}
    </div>
  );
}

export function ResendVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerificationByEmailAction, initial);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="email" value={email} />
      <button type="submit" disabled={pending || !email} className="btn-secondary px-3 py-1.5">
        {pending ? "Envoi…" : "Renvoyer le lien de confirmation"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <>
    {state.unverifiedEmail && (
      <div className="mb-4 rounded-lg border border-amber-300 bg-amber-100 p-3 text-sm text-amber-800">
        <p className="mb-2">Ton adresse n’est pas encore confirmée.</p>
        <ResendVerificationForm email={state.unverifiedEmail} />
      </div>
    )}
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field name="email" label="Adresse e-mail" type="email" autoComplete="email" />
      <Field name="password" label="Mot de passe" type="password" autoComplete="current-password" />
      <Message state={state} />
      <Submit>Se connecter</Submit>
      <div className="flex justify-between text-sm">
        <Link href="/mot-de-passe-oublie" className="text-neutral-600 underline-offset-2 hover:underline">
          Mot de passe oublié ?
        </Link>
        <Link href="/inscription" className="font-medium text-rouge underline-offset-2 hover:underline">
          Créer un compte
        </Link>
      </div>
    </form>
    </>
  );
}

export function RegisterForm({ needsCode }: { needsCode: boolean }) {
  const [state, action] = useActionState(registerAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Field name="pseudo" label="Pseudo" autoComplete="username" hint="3 à 20 caractères, visible dans le classement." />
      <Field name="email" label="Adresse e-mail" type="email" autoComplete="email" />
      <Field
        name="password"
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum, avec au moins une lettre et un chiffre."
      />
      {needsCode && <Field name="code" label="Code d’invitation" autoComplete="off" />}
      <Message state={state} />
      <Submit>Créer mon compte</Submit>
      <p className="text-center text-sm text-neutral-600">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-medium text-rouge underline-offset-2 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Field name="email" label="Adresse e-mail du compte" type="email" autoComplete="email" />
      <Message state={state} />
      <Submit>Recevoir un lien</Submit>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field
        name="password"
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum, avec au moins une lettre et un chiffre."
      />
      <Field name="confirm" label="Confirmation" type="password" autoComplete="new-password" />
      <Message state={state} />
      <Submit>Enregistrer</Submit>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial);
  return (
    <form action={action} className="space-y-4">
      <Field name="current" label="Mot de passe actuel" type="password" autoComplete="current-password" />
      <Field
        name="password"
        label="Nouveau mot de passe"
        type="password"
        autoComplete="new-password"
        hint="8 caractères minimum, avec au moins une lettre et un chiffre."
      />
      <Field name="confirm" label="Confirmation" type="password" autoComplete="new-password" />
      <Message state={state} />
      <Submit>Changer le mot de passe</Submit>
    </form>
  );
}

export function ChangeEmailForm({ current }: { current: string }) {
  const [state, action] = useActionState(requestEmailChangeAction, initial);
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-neutral-600">
        Adresse actuelle : <strong>{current}</strong>
      </p>
      <Field name="email" label="Nouvelle adresse e-mail" type="email" autoComplete="email" />
      <Field name="password" label="Mot de passe actuel" type="password" autoComplete="current-password" />
      <Message state={state} />
      <Submit>Changer d’adresse</Submit>
    </form>
  );
}
