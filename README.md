# Rouge & Noir — Les Pronostics

Pronostics des matchs du Stade Rennais FC, saison 2026-2027.
Next.js 15 · TypeScript · Tailwind CSS 4 · Prisma 6 · PostgreSQL (Neon) · Vercel.

## Installation locale (Windows, PowerShell)

Dans `C:\xampp\SRFC Pronos` :

1. Créer la base sur Neon : un nouveau projet « srfc-pronos ». Garder une branche pour le
   développement et une pour la production (comme pour F1 Pronos).
2. Copier `.env.example` en `.env` et remplir `DATABASE_URL`, `DIRECT_URL` et `SESSION_SECRET` :
   ```
   Copy-Item .env.example .env
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```
3. Installer les dépendances :
   ```
   npm install
   ```
4. Créer les tables, puis le trigger de verrouillage des pronostics :
   ```
   npx prisma migrate dev --name init
   npx prisma migrate dev --create-only --name prediction_lock
   npm run db:lock
   npx prisma migrate dev
   ```
5. Créer le compte administrateur (un mot de passe provisoire s'affiche) :
   ```
   npm run admin:create -- --email toi@exemple.fr --pseudo TonPseudo
   ```
6. Lancer les tests puis le site :
   ```
   npm test
   npm run dev
   ```
   Le site est sur http://localhost:3000.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion Neon « pooled » utilisée par le site |
| `DIRECT_URL` | Connexion Neon directe, pour les migrations |
| `SESSION_SECRET` | Clé de signature des sessions (32 caractères minimum) |
| `APP_URL` | Adresse du site, pour les liens des e-mails |
| `REGISTRATION_CODE` | Facultatif : code d'invitation exigé à l'inscription |
| `RESEND_API_KEY`, `EMAIL_FROM` | Facultatif : envoi des e-mails (sinon affichés dans le terminal) |
| `CRON_SECRET` | Protège l'adresse de synchronisation planifiée |
| `SEASON_START_YEAR`, `ESPN_TEAM_ID` | Saison suivie (2026) et identifiant ESPN du Stade Rennais (169) |

## Synchronisation des données (ESPN)

Une seule fonction, `runSmartSync`, fait tout ce qui est nécessaire et rien de plus :

| Élément | Fréquence |
|---|---|
| Calendrier (3 compétitions) | toutes les 6 heures |
| Effectif | toutes les 24 heures |
| Cotes buteur (matchs des 48 h à venir) | toutes les 2 heures, jusqu'au coup d'envoi |
| Match en direct | à chaque appel (au plus toutes les 45 s) |
| Résultat | confirmé 2 h 30 après le coup d'envoi, puis revérifié pendant 24 h |

Elle est déclenchée par :
- le bouton « Synchroniser maintenant » de l'administration (synchro complète) ;
- chaque visite de l'accueil, en arrière-plan ;
- Vercel Cron, une fois par jour (`vercel.json`) ;
- en production, cron-job.org (gratuit) toutes les minutes sur
  `https://<ton-site>/api/cron/sync`, avec l'en-tête `Authorization: Bearer <CRON_SECRET>`.

Deux appels simultanés ne se chevauchent jamais, et relancer une synchro n'ajoute jamais de points.

## Organisation

- `src/lib/scoring/` : barème, bonus buteur, verrouillage, classement (+ tests).
- `src/lib/auth/` : sessions, mots de passe, limitation des tentatives.
- `src/app/` : pages et actions serveur.
- `prisma/` : schéma et trigger SQL de verrouillage.
- `scripts/` : création de l'admin, vérification des sources de données.

## Sécurité

- Mots de passe hachés (bcrypt), session signée dans un cookie httpOnly.
- Limitation : 5 échecs de connexion par compte et 20 par adresse IP sur 15 minutes ;
  inscriptions et demandes de réinitialisation limitées.
- Changer de mot de passe ou désactiver un compte déconnecte ses autres sessions.
- Verrouillage des pronostics au coup d'envoi imposé par le serveur ET par la base (trigger).

## Administration

Menu : Vue d’ensemble (synchro, journaux), Participants, Matchs et dates limites, Joueurs, Cotes, Barème, Messages push.
Toutes les modifications ayant un effet sur les points sont enregistrées dans le journal (`AdminAuditLog`).

## Notifications push

1. `node scripts/generate-vapid.mjs` puis copier les trois lignes `VAPID_*` dans `.env` et dans Vercel.
2. Chaque joueur active les notifications dans « Mon compte » (sur iPhone : installer d’abord le site sur l’écran
   d’accueil depuis Safari).
3. Rappels automatiques 1 h avant le verrouillage de chaque match, seulement si le pronostic n’est pas saisi ;
   l’admin peut aussi envoyer un message à tous depuis « Messages push ».
Les notifications ne transportent aucun contenu : le téléphone demande le texte au site (`public/sw.js`).
