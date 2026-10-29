import type { Metadata } from "next";
import { logoutAction } from "@/app/actions/auth";
import { AvatarEditor } from "@/components/AvatarEditor";
import { ChangeEmailForm, ChangePasswordForm } from "@/components/forms";
import { replayTutorialAction } from "@/app/actions/auth";
import { PushToggle } from "@/components/PushToggle";
import { EmailRemindersForm } from "@/components/AccountForms";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { Avatar } from "@/components/Avatar";
import { ProfileStats } from "@/components/ProfileStats";
import { SeasonHistory } from "@/components/SeasonHistory";
import { activeLeagueScope } from "@/lib/leagues";

export const metadata: Metadata = { title: "Mon compte" };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const user = await requireUser();
  const { email: emailChanged } = await searchParams;
  const scope = await activeLeagueScope(user);
  const memberIds = scope?.memberIds ?? null;
  return (
    <div className="space-y-8">
      {emailChanged === "ok" && (
        <p role="status" className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">✓ Ta nouvelle adresse e-mail est confirmée.</p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar userId={user.id} pseudo={user.pseudo} at={user.avatarUpdatedAt?.getTime() ?? null} size={56} />
          <div>
          <h1 className="page-title">{user.pseudo}</h1>
          <p className="mt-1 text-sm text-neutral-600">
            {user.email} · inscrit depuis le {formatDate(user.createdAt)}
            {user.role === "ADMIN" && " · administrateur"}
          </p>
          </div>
        </div>
        <form action={replayTutorialAction}>
          <button type="submit" className="btn-secondary">
            Revoir le didacticiel
          </button>
        </form>
        <form action={logoutAction}>
          <button type="submit" className="btn-secondary">
            Se déconnecter
          </button>
        </form>
      </div>

      <ProfileStats userId={user.id} memberIds={memberIds} since={scope?.since} competitions={scope?.competitions} showMissing={false} />

      <SeasonHistory userId={user.id} memberIds={memberIds} />

      <section className="card max-w-md">
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">Photo de profil</h2>
        <AvatarEditor userId={user.id} pseudo={user.pseudo} at={user.avatarUpdatedAt?.getTime() ?? null} />
      </section>

      <section className="card max-w-md">
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">Notifications</h2>
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Sur cet appareil</p>
            <PushToggle publicKey={process.env.VAPID_PUBLIC_KEY?.trim() || null} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Par e-mail</p>
            <EmailRemindersForm enabled={user.emailReminders} verified={Boolean(user.emailVerifiedAt)} />
          </div>
        </div>
      </section>

      <section className="card max-w-md">
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">Adresse e-mail</h2>
        <ChangeEmailForm current={user.email} />
      </section>

      <section className="card max-w-md">
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-wide">Changer de mot de passe</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
