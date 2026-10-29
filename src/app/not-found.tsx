import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="page-title">Page introuvable</h1>
      <p className="mt-3 text-neutral-600">Cette page n’existe pas ou a été déplacée.</p>
      <Link href="/" className="btn-primary mt-6">
        Retour à l’accueil
      </Link>
    </div>
  );
}
