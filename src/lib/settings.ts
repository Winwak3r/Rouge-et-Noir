/** Score maximal proposé dans les menus déroulants (configurable). */
export function maxPredictedGoals(): number {
  const n = Number(process.env.MAX_PREDICTED_GOALS ?? 15);
  return Number.isInteger(n) && n >= 5 && n <= 30 ? n : 15;
}
