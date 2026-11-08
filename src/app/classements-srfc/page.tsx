import { redirect } from "next/navigation";

// Les classements officiels sont désormais un onglet de la page « Actualités du SRFC ».
export default function OldStandingsPage() {
  redirect("/actus?onglet=classements");
}
