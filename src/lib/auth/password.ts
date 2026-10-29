import bcrypt from "bcryptjs";

const COST = 12;
// Empreinte factice : on compare même si le compte n'existe pas (temps de réponse identique).
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Q7cFJ6z1xg3Zr0J3Yk1pY2hIu0rQ9K";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const ok = await bcrypt.compare(password, hash ?? DUMMY_HASH);
  return hash !== null && ok;
}
