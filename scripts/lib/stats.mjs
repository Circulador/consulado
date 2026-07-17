/** Lógica estatística compartilhada (app + testes CI). */

export function p2(n) {
  return String(n).padStart(2, '0');
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function rollingMonthKeys(count, fromDate = new Date()) {
  const end = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    out.push({
      y: d.getFullYear(),
      m: d.getMonth() + 1,
      key: `${d.getFullYear()}-${p2(d.getMonth() + 1)}`,
      label: `${MONTHS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
    });
  }
  return out;
}

export function computeRollingThroughput(monthCounts, fromDate = new Date()) {
  const m3 = rollingMonthKeys(3, fromDate);
  const m6 = rollingMonthKeys(6, fromDate);
  const m12 = rollingMonthKeys(12, fromDate);
  const sum = (months) => months.reduce((a, m) => a + (monthCounts[m.key] || 0), 0);
  const thrMedTrim = Math.max(Math.round(sum(m3) / 3), 1);
  const thrSem = Math.max(Math.round(sum(m6) / 6), 1);
  const thrPico = Math.max(...m6.map((m) => monthCounts[m.key] || 0), 1);
  const consRate = Math.max(Math.round(thrSem * 0.7), 1);
  return { thrPico, thrMedTrim, thrSem, consRate, months12: m12 };
}

export function computePositionEta(ahead, rate, today = new Date()) {
  const d = Math.round(ahead / Math.max(rate, 1) * 30.44);
  return { d, date: new Date(today.getTime() + d * 86400000) };
}

export function computePositionProjection({ ahead, thrPico, thrMedTrim, thrSem, consRate, today = new Date() }) {
  return {
    opt: computePositionEta(ahead, thrPico, today),
    real: computePositionEta(ahead, thrMedTrim, today),
    cons: computePositionEta(ahead, consRate ?? Math.max(Math.round(thrSem * 0.7), 1), today),
  };
}

export function blendHybridDays(posDays, kmRemainDays, weightPos = 0.5) {
  if (kmRemainDays == null || kmRemainDays < 0) return posDays;
  return Math.round(posDays * weightPos + kmRemainDays * (1 - weightPos));
}

export function kmRemainingDays(medianSurvival, waited) {
  if (medianSurvival == null) return null;
  return Math.max(0, medianSurvival - waited);
}

export function qualityLevel(resolvedCount) {
  if (resolvedCount < 15) return 'low';
  if (resolvedCount < 40) return 'medium';
  return 'high';
}

export function dataAgeDays(generatedAtIso, today = new Date()) {
  if (!generatedAtIso) return null;
  const m = String(generatedAtIso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const gen = new Date(+m[1], +m[2] - 1, +m[3]);
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t0 - gen) / 86400000);
}
