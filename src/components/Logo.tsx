// Emplacement de logo provisoire (écusson générique rouge et noir).
// À remplacer par le blason officiel uniquement si son utilisation est autorisée.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 46" className={className} role="img" aria-label="Rouge & Noir">
      <path d="M20 1 38 7v16c0 11-8 19-18 22C10 42 2 34 2 23V7z" fill="#111111" stroke="var(--logo-edge)" strokeWidth="1.5" />
      <path d="M20 5 34 9.7V23c0 8.6-6 15-14 17.8z" fill="#e1001a" />
      <text x="20" y="28" textAnchor="middle" fontSize="13" fontWeight="700" fill="#ffffff" fontFamily="system-ui, sans-serif">
        RN
      </text>
    </svg>
  );
}
