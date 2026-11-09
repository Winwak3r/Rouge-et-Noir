import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { setDefaultLeagueAction } from "@/app/actions/leagues";
import { BonusIcon } from "@/components/BonusIcon";
import { CompetitionBadge } from "@/components/CompetitionBadge";
import { InviteBox } from "@/components/LeagueAdminForms";
import { LeagueAvatar } from "@/components/LeagueAvatar";
import { CreateLeagueForm, JoinLeagueForm, LeaveLeagueForm } from "@/components/LeagueForms";
import { LeagueHub } from "@/components/LeagueHub";
import { PageTitle } from "@/components/PageTitle";
import { requireUser } from "@/lib/auth/session";
import { bonusStock } from "@/lib/bonus-data";
import { loadBoard } from "@/lib/board-data";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/email";
import { MAX_LEAGUES, canJoinAnother } from "@/lib/league-rules";
import { myLeagues } from "@/lib/leagues";
import { BONUS_INFO, BONUS_KINDS } from "@/lib/scoring/bonus";

export const metadata: Metadata = { title: "Mes Ligues" };

const H = "font-display text-lg font-bold uppercase tracking-wide text-rouge";

/** « Mes Ligues » : classement de la ligue choisie + ses infos, gestion, spécialités restantes et invitation. */
export default async function MyLeaguesPage({ searchParams }: { searchParams: Promise<{ rejoint?: string; invitation?: string; vue?: string }> }) {
  const user = await requireUser();
  const q = await searchParams;
  const [leagues, board, season] = await Promise.all([
    myLeagues(user.id),
    loadBoard(q.vue),
    prisma.season.findFirst({ where: { isCurrent: true }, select: { id: true } }),
  ]);
  const active = leagues.filter((m) => m.isActive);
  const canAdd = canJoinAnother(leagues.length);

  // Panneau d'infos de chaque ligue (à droite du classement)
  const panels: Record<string, ReactNode> = {};
  await Promise.all(
    active.map(async (m) => {
      const l = m.league;
      const admin = m.role === "ADMIN";
      const url = appUrl(`/rejoindre/${l.inviteCode}`);
      const [stock, qrSvg, qrPng] = await Promise.all([
        season ? bonusStock(user.id, l.id, season.id) : null,
        admin ? QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }) : "",
        admin ? QRCode.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: "M" }) : "",
      ]);
      const isDefault = user.activeLeagueId === l.id;
      panels[l.id] = (
        <div className="space-y-4">
          <section className="card space-y-3">
            <div className="flex items-start gap-3">
              <LeagueAvatar leagueId={l.id} name={l.name} at={l.imageUpdatedAt?.getTime() ?? null} size={64} />
              <div className="min-w-0 space-y-1">
                <p className="text-lg font-bold leading-tight">{l.name}</p>
                {l.description && <p className="text-sm text-neutral-600">{l.description}</p>}
                <p className="text-xs text-neutral-500">
                  {l._count.members} joueur{l._count.members > 1 ? "s" : ""} · {admin ? "Administrateur" : "Membre"}
                  {isDefault ? " · Ligue par défaut" : ""}
                </p>
                <span className="flex gap-1">
                  {l.competitions.map((c) => (
                    <CompetitionBadge key={c} code={c} logo={board.logos[c]} />
                  ))}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {admin && (
                <Link href={`/ligue?id=${l.id}`} className="btn-primary px-3 py-1.5 text-sm">
                  Gérer ma ligue
                </Link>
              )}
              {!isDefault && (
                <form action={setDefaultLeagueAction}>
                  <input type="hidden" name="leagueId" value={l.id} />
                  <button className="btn-secondary px-3 py-1.5 text-sm">Définir par défaut</button>
                </form>
              )}
              <LeaveLeagueForm leagueId={l.id} name={l.name} />
            </div>
          </section>

          {stock && (
            <section className="card space-y-2">
              <h2 className={H}>Mes spécialités maison</h2>
              <ul className="space-y-1.5">
                {BONUS_KINDS.map((k) => (
                  <li key={k} className="flex items-center gap-2 text-sm">
                    <BonusIcon kind={k} size={30} />
                    <span className="flex-1">{BONUS_INFO[k].name}</span>
                    <span className={`font-bold tabular-nums ${stock[k] > 0 ? "text-green-700" : "text-neutral-400"}`}>{stock[k]} restant{stock[k] > 1 ? "s" : ""}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card space-y-2">
            <h2 className={H}>Inviter des joueurs</h2>
            {admin ? (
              <InviteBox key={l.id} leagueId={l.id} url={url} code={l.inviteCode} qrSvg={qrSvg} qrPng={qrPng} />
            ) : (
              <div className="space-y-1 text-sm">
                <p>
                  Code d’invitation : <strong className="font-mono tracking-wider">{l.inviteCode}</strong>
                </p>
                <p className="break-all text-xs text-neutral-600">{url}</p>
              </div>
            )}
          </section>
        </div>
      );
    }),
  );
  panels.general = (
    <section className="card space-y-2">
      <p className="text-lg font-bold">Général R&amp;N</p>
      <p className="text-sm text-neutral-600">
        Tous les joueurs inscrits dans une ligue et ayant pronostiqué au moins un match, sur toute la saison. Les spécialités maison n’y
        comptent pas.
      </p>
    </section>
  );

  return (
    <div className="space-y-6">
      <PageTitle compactBar={false} className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">
        Mes Ligues
      </PageTitle>
      {q.rejoint && <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">Bienvenue dans la ligue « {q.rejoint} » !</p>}
      {q.invitation === "invalide" && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">Ce lien d’invitation n’est plus valable. Demande un nouveau lien à l’administrateur de la ligue.</p>
      )}
      {q.invitation === "suspendu" && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">Ton accès à cette ligue a été suspendu par son administrateur.</p>
      )}
      {active.length === 0 && <p className="card text-sm text-neutral-600">Tu n’es dans aucune ligue pour l’instant : voici le classement Général R&amp;N.</p>}

      <LeagueHub views={board.views} initial={board.initial} me={board.me?.id ?? null} logos={board.logos} panels={panels} />

      <p className="text-sm text-neutral-600">
        {leagues.length}/{MAX_LEAGUES} ligues.{" "}
        {canAdd ? "Tu peux encore en rejoindre ou en créer." : "Maximum atteint : quittes-en une pour en rejoindre ou en créer une autre."}
      </p>
      {canAdd && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card space-y-2">
            <h2 className={H}>Rejoindre une ligue</h2>
            <JoinLeagueForm />
          </section>
          <section id="creer" className="card scroll-mt-40 space-y-2">
            <h2 className={H}>Créer une ligue</h2>
            <CreateLeagueForm logos={board.logos} />
          </section>
        </div>
      )}
    </div>
  );
}
