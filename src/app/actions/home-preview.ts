"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { HOME_V2_COOKIE } from "@/lib/home-preview";

/** Administrateur : passer à l'aperçu de la page d'accueil remodelée, ou revenir à la version actuelle. */
export async function toggleHomeV2Action(): Promise<void> {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") redirect("/");
  const jar = await cookies();
  if (jar.get(HOME_V2_COOKIE)?.value === "1") jar.delete(HOME_V2_COOKIE);
  else jar.set(HOME_V2_COOKIE, "1", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
  redirect("/");
}
