import Link from "next/link";
import type { Metadata } from "next";
import { logoutAction } from "@/app/actions/auth";
import { AvatarEditor } from "@/components/AvatarEditor";
import { ChangeEmailForm, ChangePasswordForm } from "@/components/forms";
import { replayTutorialAction } from "@/app/actions/auth";
import { PushToggle } from "@/components/PushToggle";
import { EmailRemindersForm, PushPrefsForm } from "@/components/AccountForms";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { Avatar } from "@/components/Avatar";
import { ProfileStats } from "@/components/ProfileStats";
import { SeasonHistory } from "@/components/SeasonHistory";
import { BonusIcon } from "@/components/BonusIcon";
import { BONUS_INFO, BONUS_KINDS } from "@/lib/scoring/bonus";
import { bonusStock } from "@/lib/bonus-data";
import { prisma } from "@/lib/db";
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
        {user.role === "ADMIN" && (
          <Link href="/admin" className="btn-secondary">
            Administration
          </Link>
        )}
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

      <ProfileStats userId={user.id} memberIds={memberIds} since={scope?.since} competitions={scope?.competitions} leagueId={scope && !scope.general ? scope.leagueId : null} showMissing={false} />

      <SeasonHistory userId={user.id} memberIds={memberIds} />

      <BonusStocks userId={user.id} />

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
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Je veux être prévenu</p>
            <PushPrefsForm live={user.pushLive} prematch={user.pushPrematch} />
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


/** « Les Spécialités Maison » restantes dans chacune de mes ligues (saison en cours). */
async function BonusStocks({ userId }: { userId: string }) {
  const [season, memberships] = await Promise.all([
    prisma.season.findFirst({ where: { isCurrent: true }, select: { id: true } }),
    prisma.leagueMember.findMany({ where: { userId, isActive: true }, include: { league: { select: { id: true, name: true } } } }),
  ]);
  if (!season || memberships.length === 0) return null;
  const stocks = await Promise.all(memberships.map((m) => bonusStock(userId, m.league.id, season.id)));
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold uppercase tracking-wide">Mes Spécialités Maison</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {memberships.map((m, i) => (
          <div key={m.league.id} className="card space-y-2">
            <p className="font-semibold">{m.league.name}</p>
            <ul className="space-y-1.5">
              {BONUS_KINDS.map((k) => (
                <li key={k} className="flex items-center gap-2 text-sm">
                  <BonusIcon kind={k} size={28} />
                  <span className="flex-1">{BONUS_INFO[k].name}</span>
                  <span className={`font-bold tabular-nums ${stocks[i][k] > 0 ? "text-green-700" : "text-neutral-400"}`}>{stocks[i][k]}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
