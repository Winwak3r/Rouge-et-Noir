/** Pied de page : non-affiliation, sources de données et partenaires techniques, contact. */
export function Footer() {
  const contact = process.env.CONTACT_EMAIL?.trim() || process.env.GMAIL_USER?.trim() || null;
  const mail = contact ? `mailto:${contact}?subject=${encodeURIComponent("Rouge & Noir — bug ou amélioration")}` : null;
  const sources = [
    ["Calendrier, résultats, compositions et classements", "ESPN"],
    ["Cotes des buteurs et du match", "Bet365, via ESPN"],
    ["Photos des joueurs", "API-Football"],
    ["Hébergement", "Vercel"],
    ["Base de données", "Neon"],
  ];
  return (
    <footer className="border-t border-neutral-200 bg-[var(--header-bg)] pb-28 pt-6 text-xs text-neutral-500 sm:pb-8">
      <div className="mx-auto max-w-5xl space-y-4 px-4">
        <p className="leading-relaxed">
          <strong className="text-neutral-700">Rouge &amp; Noir</strong> est un jeu de pronostics entre amis, gratuit et non officiel. Il n’est
          ni affilié, ni soutenu, ni sponsorisé par le Stade Rennais FC, la Ligue de Football Professionnel, l’UEFA ou la Fédération
          Française de Football. Les noms, logos et marques cités appartiennent à leurs propriétaires respectifs.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div>
            <p className="mb-1 font-bold uppercase tracking-wide text-neutral-600">Données et partenaires</p>
            <ul className="space-y-0.5">
              {sources.map(([what, who]) => (
                <li key={what}>
                  {what} : <span className="font-semibold text-neutral-700">{who}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="sm:text-right">
            <p className="mb-1 font-bold uppercase tracking-wide text-neutral-600">Contact</p>
            <p>Un bug, une idée d’amélioration ?</p>
            {mail ? (
              <a href={mail} className="font-semibold text-rouge underline-offset-2 hover:underline">
                {contact}
              </a>
            ) : (
              <p>Contacte l’administrateur du jeu.</p>
            )}
          </div>
        </div>
        <p>© {new Date().getFullYear()} Rouge &amp; Noir — Les Pronostics</p>
      </div>
    </footer>
  );
}
