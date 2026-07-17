/** Dedupe por planilha — sem merge entre B, JSI e P (filas segregadas). */

export function normNome(n) {
  return String(n).trim().replace(/\s+/g, ' ').toUpperCase();
}

export function recordId(r) {
  return `${r.planilha}|${r.entrega}|${normNome(r.nome)}`;
}

/**
 * Remove duplicatas exatas dentro de cada planilha.
 * Preserva homônimos (mesma sigla, datas diferentes).
 */
export function dedupeSheetRecords(records) {
  const byExact = new Map();
  for (const r of records) byExact.set(recordId(r), r);
  const list = [...byExact.values()];

  const homonyms = [];
  const bySheetNome = new Map();
  for (const r of list) {
    const k = `${r.planilha}|${normNome(r.nome)}`;
    if (!bySheetNome.has(k)) bySheetNome.set(k, []);
    bySheetNome.get(k).push(r);
  }
  for (const [key, recs] of bySheetNome) {
    if (recs.length > 1 && new Set(recs.map((x) => x.entrega)).size > 1) {
      const [planilha, nome] = key.split('|');
      homonyms.push({
        nome,
        planilha,
        tipo: 'homonimo',
        registros: recs.length,
        entregas: recs.map((x) => x.entrega),
      });
    }
  }

  const bySheet = { B: 0, JSI: 0, P: 0 };
  for (const r of list) {
    if (bySheet[r.planilha] != null) bySheet[r.planilha]++;
  }

  return {
    records: list,
    before: records.length,
    after: list.length,
    duplicates_removed: records.length - list.length,
    homonyms,
    by_sheet: bySheet,
  };
}

/** @deprecated Use dedupeSheetRecords — mantido para scripts legados. */
export function mergeMigratingRecords(records) {
  return dedupeSheetRecords(records);
}
