import { releasePlayerAction, savePlayerAction, syncPhotosAction } from "@/app/actions/admin";
import { formatDate } from "@/lib/dates";
import { lastPhotosSync } from "@/lib/sync/sync";
import { ActionForm } from "@/components/ActionForm";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { PlayerPhotoEditor } from "@/components/PlayerPhotoEditor";
import { playerPhotoUrl } from "@/lib/player-photo";
import { prisma } from "@/lib/db";

const POSITIONS = [
  ["F", "Attaquant"],
  ["M", "Milieu"],
  ["D", "Défenseur"],
  ["G", "Gardien"],
] as const;

function Fields({ p }: { p?: { id: string; name: string; position: string | null; shirtNumber: number | null; isActive: boolean } }) {
  return (
    <>
      {p && <input type="hidden" name="playerId" value={p.id} />}
      <div className="grid gap-2 sm:grid-cols-[1fr_9rem_5rem_auto] sm:items-end">
        <label className="text-sm">
          <span className="label">Nom</span>
          <input name="name" required defaultValue={p?.name} maxLength={60} className="input" />
        </label>
        <label className="text-sm">
          <span className="label">Poste</span>
          <select name="position" defaultValue={p?.position ?? ""} className="input">
            <option value="">—</option>
            {POSITIONS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="label">N°</span>
          <input name="shirtNumber" inputMode="numeric" defaultValue={p?.shirtNumber ?? ""} className="input" />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={p ? p.isActive : true} /> Dans l’effectif
        </label>
      </div>
    </>
  );
}

export default async function PlayersAdminPage() {
  const lastPhotos = await lastPhotosSync();
  const days = Number(process.env.PHOTOS_SYNC_DAYS ?? 60);
  const players = await prisma.player.findMany({
    where: { season: { isCurrent: true } },
    orderBy: [{ isActive: "desc" }, { position: "asc" }, { name: "asc" }],
  });
  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Joueurs</h1>
        <p className="mt-1 text-sm text-neutral-600">
          L’effectif est mis à jour chaque jour depuis ESPN, et les photos officielles depuis API-Football. Une photo déposée ici
          remplace la photo officielle. Une fiche modifiée ici (nom, poste, numéro, présence) n’est plus
          écrasée par la synchro, jusqu’à ce que tu la « rendes à la synchro ». Les joueurs retirés de l’effectif restent
          liés aux pronostics déjà faits.
        </p>
      </div>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Photos officielles</h2>
        <p className="text-sm text-neutral-600">
          Mises à jour automatiquement tous les {days} jours (1 requête API-Football à chaque fois). Dernière mise à jour :{" "}
          <strong>{lastPhotos ? formatDate(lastPhotos) : "jamais"}</strong>. Pense à les mettre à jour après chaque mercato
          (début septembre et début février) ou à l’arrivée d’une recrue.
        </p>
        <ActionForm action={syncPhotosAction} submits={[{ label: "Mettre à jour les photos maintenant" }]} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Ajouter un joueur</h2>
        <ActionForm action={savePlayerAction} submits={[{ label: "Ajouter" }]}>
          <Fields />
        </ActionForm>
      </section>

      <section className="space-y-2">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Effectif ({players.filter((p) => p.isActive).length})</h2>
        {players.map((p) => (
          <details key={p.id} className={`rounded-lg border border-neutral-200 bg-surface ${p.isActive ? "" : "opacity-60"}`}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="w-7 text-right font-display font-bold text-neutral-500">{p.shirtNumber ?? "–"}</span>
              <PlayerPhoto name={p.name} url={playerPhotoUrl(p)} size={28} />
              <span className="font-semibold">{p.name}</span>
              <span className="text-neutral-500">{POSITIONS.find(([v]) => v === p.position)?.[1] ?? ""}</span>
              {!p.isActive && <span className="rounded bg-neutral-200 px-1.5 text-xs">hors effectif</span>}
              {p.adminLocked && <span className="rounded bg-orange-100 px-1.5 text-xs text-orange-800">modifié par l’admin</span>}
              {p.externalId < 0 && <span className="rounded bg-neutral-100 px-1.5 text-xs">ajout manuel</span>}
            </summary>
            <div className="space-y-3 border-t border-neutral-200 p-3">
              <PlayerPhotoEditor playerId={p.id} name={p.name} url={playerPhotoUrl(p)} custom={Boolean(p.customPhotoAt)} />
              <ActionForm action={savePlayerAction} submits={[{ label: "Enregistrer" }]}>
                <Fields p={p} />
              </ActionForm>
              {p.adminLocked && p.externalId > 0 && (
                <form action={releasePlayerAction}>
                  <input type="hidden" name="playerId" value={p.id} />
                  <button type="submit" className="btn-secondary px-3 py-1 text-xs">Rendre la fiche à la synchro</button>
                </form>
              )}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
