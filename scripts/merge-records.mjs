/** Regras de merge entre planilhas B, JSI e P (compartilhado por gerar-dados e index.html). */

export function normNome(n) {
  return String(n).trim().replace(/\s+/g, ' ').toUpperCase();
}

export function recordId(r) {
  return `${r.planilha}|${r.entrega}|${normNome(r.nome)}`;
}

/**
 * Mescla registros das 3 planilhas:
 * - Chave base: planilha + entrega + nome (preserva homônimos na mesma planilha)
 * - Migração B→JSI: pareia 1 B (entrega anterior) com 1 JSI e remove o B obsoleto
 * - Migração B→P: pareia pendência quando há 1 B candidato
 * - Homônimos (mesma sigla, datas diferentes na mesma planilha): mantidos todos
 */
export function mergeMigratingRecords(records) {
  const byExact = new Map();
  for (const r of records) byExact.set(recordId(r), r);
  const list = [...byExact.values()];
  const toDrop = new Set();
  const dropped = [];
  const homonyms = [];

  const byNome = new Map();
  for (const r of list) {
    const n = normNome(r.nome);
    if (!byNome.has(n)) byNome.set(n, []);
    byNome.get(n).push(r);
  }

  for (const [nome, recs] of byNome) {
    const bs = recs.filter((r) => r.planilha === 'B');
    const jsis = recs.filter((r) => r.planilha === 'JSI');
    const ps = recs.filter((r) => r.planilha === 'P');

    if (bs.length > 1 && new Set(bs.map((b) => b.entrega)).size > 1) {
      homonyms.push({
        nome,
        tipo: 'homonimo_B',
        registros: bs.length,
        entregas: bs.map((b) => b.entrega),
      });
    }

    const pairedB = new Set();

    for (const j of jsis) {
      const candidates = bs.filter(
        (b) =>
          !pairedB.has(recordId(b)) &&
          !toDrop.has(recordId(b)) &&
          (b.entrega < j.entrega || (b.resol && b.entrega <= j.entrega)),
      );

      if (candidates.length === 0) continue;

      let best;
      if (candidates.length === 1) {
        best = candidates[0];
      } else {
        const withResol = candidates.filter((b) => b.resol && b.resol <= j.entrega);
        if (withResol.length === 1) best = withResol[0];
        else if (withResol.length > 1) {
          best = withResol.sort((a, b) => b.entrega.localeCompare(a.entrega))[0];
        } else {
          best = candidates.sort((a, b) => b.entrega.localeCompare(a.entrega))[0];
        }
        homonyms.push({
          nome,
          tipo: 'pareamento_B_JSI_ambiguo',
          jsi_entrega: j.entrega,
          b_escolhido: best.entrega,
          b_alternativas: candidates.filter((c) => c !== best).map((c) => c.entrega),
        });
      }

      toDrop.add(recordId(best));
      pairedB.add(recordId(best));
      dropped.push({
        nome,
        kept: 'JSI',
        removed: 'B',
        entregaB: best.entrega,
        entregaJSI: j.entrega,
        tipo: 'migracao',
      });
    }

    for (const p of ps) {
      const unmatchedB = bs.filter((b) => !toDrop.has(recordId(b)) && !pairedB.has(recordId(b)));
      if (unmatchedB.length !== 1) {
        if (unmatchedB.length > 1) {
          homonyms.push({
            nome,
            tipo: 'P_multiplos_B',
            p_entrega: p.entrega,
            b_entregas: unmatchedB.map((b) => b.entrega),
          });
        }
        continue;
      }
      const b = unmatchedB[0];
      if (/pend/i.test(b.nome) || /pend/i.test(p.nome) || !b.resol) {
        toDrop.add(recordId(b));
        dropped.push({ nome, kept: 'P', removed: 'B', entregaB: b.entrega, tipo: 'pendencia' });
      }
    }
  }

  const final = list.filter((r) => !toDrop.has(recordId(r)));
  return {
    records: final,
    dropped,
    homonyms,
    before: list.length,
    after: final.length,
  };
}
