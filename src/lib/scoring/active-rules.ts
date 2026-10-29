import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_RULES, type ScoringRules } from "./rules";

function merge(r: Partial<ScoringRules>, version: number): ScoringRules {
  return {
    ...DEFAULT_RULES,
    ...r,
    version,
    points: { ...DEFAULT_RULES.points, ...(r.points ?? {}) },
    scorerBonus: { ...DEFAULT_RULES.scorerBonus, ...(r.scorerBonus ?? {}) },
    scorerFallback: { ...DEFAULT_RULES.scorerFallback, ...(r.scorerFallback ?? {}) },
  };
}

/** Barème actif en base, complété par les valeurs par défaut. */
export async function getActiveRules(): Promise<ScoringRules> {
  const row = await prisma.scoringRuleSet.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } });
  return row ? merge(row.rules as unknown as Partial<ScoringRules>, row.version) : DEFAULT_RULES;
}

/** Barème d'une version donnée (celle appliquée à un match déjà clôturé). */
export async function getRulesByVersion(version: number): Promise<ScoringRules> {
  const row = await prisma.scoringRuleSet.findUnique({ where: { version } });
  if (row) return merge(row.rules as unknown as Partial<ScoringRules>, row.version);
  return version === DEFAULT_RULES.version ? DEFAULT_RULES : getActiveRules();
}

/** Enregistre un nouveau barème (nouvelle version, devient le barème actif). */
export async function saveRules(rules: Omit<ScoringRules, "version">, adminId: string): Promise<number> {
  const last = await prisma.scoringRuleSet.findFirst({ orderBy: { version: "desc" } });
  const version = Math.max(last?.version ?? 0, DEFAULT_RULES.version) + 1;
  await prisma.$transaction([
    prisma.scoringRuleSet.updateMany({ data: { isActive: false } }),
    prisma.scoringRuleSet.create({
      data: { version, rules: rules as unknown as Prisma.InputJsonValue, isActive: true, createdById: adminId },
    }),
  ]);
  return version;
}
