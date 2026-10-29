import { broadcastPushAction, saveAnnouncementAction, sendEmailRemindersNowAction, setEmailRemindersAction } from "@/app/actions/admin";
import { emailRemindersEnabled } from "@/lib/email-reminders";
import { canEditPrediction } from "@/lib/scoring/engine";
import { ActionForm } from "@/components/ActionForm";
import { prisma } from "@/lib/db";
import { vapidFromEnv } from "@/lib/push/webpush";

export default async function MessagesAdminPage() {
  const now = new Date();
  const [a, subs, subUsers, emailOn, emailUsers, upcoming] = await Promise.all([
    prisma.announcement.findUnique({ where: { id: "current" } }),
    prisma.pushSubscription.count({ where: { user: { isActive: true } } }),
    prisma.pushSubscription.groupBy({ by: ["userId"], where: { user: { isActive: true } } }),
    emailRemindersEnabled(),
    prisma.user.count({ where: { isActive: true, emailReminders: true, emailVerifiedAt: { not: null } } }),
    prisma.match.findMany({
      where: { status: { in: ["SCHEDULED", "POSTPONED"] }, kickoffAt: { gt: now } },
      orderBy: { kickoffAt: "asc" },
      include: { homeTeam: true, awayTeam: true },
      take: 3,
    }),
  ]);
  const nextOpen = upcoming.find((m) => canEditPrediction(m, now)) ?? null;
  const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const configured = Boolean(vapidFromEnv());

  return (
    <div className="space-y-10">
      <h1 className="page-title">Messages et rappels</h1>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Notification à tous les joueurs</h2>
        {configured ? (
          <p className="text-sm text-neutral-600">
            {subUsers.length} joueur(s) abonné(s) sur {subs} appareil(s). Les rappels automatiques (1 h avant chaque match, si le
            pronostic n’est pas saisi) partent tout seuls.
          </p>
        ) : (
          <div className="rounded-lg border border-orange-300 bg-orange-100 p-3 text-sm text-orange-800">
            Notifications non configurées. Lance <code>node scripts/generate-vapid.mjs</code>, copie les trois lignes dans{" "}
            <code>.env</code> (et dans les variables d’environnement de Vercel), puis redémarre le site.
          </div>
        )}
        <ActionForm
          action={broadcastPushAction}
          className="card space-y-3"
          submits={[
            { label: "M’envoyer un test", value: "test", primary: false },
            { label: `Envoyer à tous (${subUsers.length})`, value: "all", confirm: "Envoyer cette notification à tous les joueurs abonnés ?" },
          ]}
        >
          <label className="block text-sm">
            <span className="label">Titre (60 caractères maximum)</span>
            <input name="title" required maxLength={60} className="input" placeholder="Ex. Match avancé à 17 h" />
          </label>
          <label className="block text-sm">
            <span className="label">Message (240 caractères maximum)</span>
            <textarea name="body" required maxLength={240} rows={3} className="input" />
          </label>
        </ActionForm>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Rappels par e-mail</h2>
        <p className="text-sm text-neutral-600">
          2 h avant le verrouillage de chaque match, un e-mail part aux joueurs qui n’ont pas encore pronostiqué (adresse
          confirmée, rappels non désactivés dans leur compte). {emailUsers} joueur(s) concerné(s). Un seul e-mail par match et par joueur.
        </p>
        {!emailConfigured && (
          <div className="rounded-lg border border-orange-300 bg-orange-100 p-3 text-sm text-orange-800">
            Envoi d’e-mails non configuré : sans <code>RESEND_API_KEY</code> et <code>EMAIL_FROM</code>, les e-mails s’affichent
            seulement dans le terminal.
          </div>
        )}
        <div className="card space-y-3">
          <ActionForm
            action={setEmailRemindersAction}
            className="flex flex-wrap items-center gap-2"
            submits={emailOn ? [{ label: "Désactiver les rappels automatiques", value: "off", primary: false }] : [{ label: "Activer les rappels automatiques", value: "on" }]}
          >
            <span className={`text-sm font-semibold ${emailOn ? "text-green-700" : "text-neutral-500"}`}>{emailOn ? "Activés" : "Désactivés"}</span>
          </ActionForm>
          {nextOpen && (
            <ActionForm
              action={sendEmailRemindersNowAction}
              className="flex flex-wrap items-center gap-2"
              submits={[
                {
                  label: `Envoyer maintenant pour ${nextOpen.homeTeam.name} – ${nextOpen.awayTeam.name}`,
                  primary: false,
                  confirm: "Envoyer le rappel maintenant aux joueurs qui n’ont pas pronostiqué ce match ?",
                },
              ]}
            >
              <input type="hidden" name="matchId" value={nextOpen.id} />
            </ActionForm>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Message à l’ouverture du site</h2>
        <p className="text-sm text-neutral-600">
          Une fenêtre affichée à l’ouverture de l’accueil, une seule fois par appareil (après « J’ai compris »). Cocher
          l’invitation aux notifications y ajoute le bouton d’activation.
        </p>
        <ActionForm
          action={saveAnnouncementAction}
          className="card space-y-3"
          submits={[{ label: "Enregistrer", value: "save" }, { label: "Enregistrer et le revoir moi-même", value: "preview", primary: false }]}
        >
          <label className="block text-sm">
            <span className="label">Titre</span>
            <input name="title" maxLength={80} defaultValue={a?.title ?? ""} className="input" />
          </label>
          <label className="block text-sm">
            <span className="label">Message</span>
            <textarea name="body" maxLength={2000} rows={5} defaultValue={a?.body ?? ""} className="input" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="askNotifications" defaultChecked={a?.askNotifications ?? false} /> Inviter à activer les notifications
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={a?.active ?? false} /> Publié
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
