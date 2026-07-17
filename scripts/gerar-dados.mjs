// scripts/gerar-dados.mjs — Badger + 3 planilhas segregadas (sem merge cross-sheet)
import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { dedupeSheetRecords } from './merge-records.mjs';

const SHEETS = [
  {
    id: 'B',
    nome: 'Planilha B — Balcão',
    url: 'https://1drv.ms/x/c/ba23482b38fbdc1e/EVyxoIPnz65Du-mLBAl7CuUBOsLybUkq3f-TJiOIyW9HBA?e=frZ3Ms',
  },
  {
    id: 'JSI',
    nome: 'Planilha JSI — Já sou Italiano',
    url: 'https://1drv.ms/x/c/ba23482b38fbdc1e/ETkw9cQ64L5Ko2WicjOlg04BiOc1mm4MLMiqKWcidPm6iA?e=4zXpjS',
  },
  {
    id: 'P',
    nome: 'Planilha P — Pendências',
    url: 'https://1drv.ms/x/c/ba23482b38fbdc1e/EekjF_2Qd5tJoDqaLQ8-IokB436GSnReRCEBHgeuyg72uA?e=az9sGs',
  },
];

const OUT = 'dados.json';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const BADGER_APP_ID = '1141147648';
const BADGER_APP_UUID = '5cbed6ac-a083-4e14-b191-b4ba07653de2';

function p2(n) { return String(n).padStart(2, '0'); }
function isoFromCell(v) {
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}`;
  if (typeof v === 'number' && v > 30000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5);
    return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  }
  if (typeof v === 'string') {
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) { let [, d, mo, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${p2(+mo)}-${p2(+d)}`; }
  }
  return null;
}

const BAD = /^(MEDIA|MÉDIA|MENOR|MAIOR|TOTAL|ULTIMO|ÚLTIMO|ESTAMOS|DATA DE|NOME|RECEBIDO|GRUPO|N[ºo°]|B PLAN|PLANILHA|ATUALIZAD|DIAS)/i;

function sheetLayout(pid) {
  if (pid === 'P') return { entregaCol: 1, nomeCol: 0, resolCol: 4, grupoCol: 2 };
  return { entregaCol: 0, nomeCol: 1, resolCol: 4, grupoCol: 2 };
}

function rowsToRecords(rows, pid) {
  const { entregaCol, nomeCol, resolCol, grupoCol } = sheetLayout(pid);
  const recs = [];
  for (const r of rows) {
    if (!r || r.length <= Math.max(entregaCol, nomeCol)) continue;
    const entrega = isoFromCell(r[entregaCol]);
    const nome = typeof r[nomeCol] === 'string' ? r[nomeCol].trim() : '';
    if (!entrega || !nome || BAD.test(nome)) continue;
    const resol = resolCol != null ? isoFromCell(r[resolCol]) : null;
    recs.push({
      entrega,
      nome: nome.replace(/\s+/g, ' '),
      grupo: r[grupoCol] != null ? String(r[grupoCol]).trim() || '-' : '-',
      resol: resol || null,
      planilha: pid,
      origem: pid,
    });
  }
  return recs;
}

function b64url(s) {
  return Buffer.from(s, 'utf-8').toString('base64').replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
}

function looksLikeXlsx(buf) {
  return buf && buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4B;
}

async function getBadgerHeaders() {
  const res = await fetch('https://api-badgerp.svc.ms/v1.0/token', {
    method: 'POST',
    headers: { AppId: BADGER_APP_ID, 'Content-Type': 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ appId: BADGER_APP_UUID }),
  });
  if (!res.ok) throw new Error(`Badger token HTTP ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('Badger token ausente na resposta');
  return {
    Authorization: `Badger ${data.token}`,
    Prefer: 'autoredeem',
    'User-Agent': UA,
    Accept: 'application/json',
  };
}

async function downloadFromUrl(url, headers, tag) {
  const res = await fetch(url, { redirect: 'follow', headers: { ...headers, Accept: '*/*' } });
  if (!res.ok) {
    console.log(`   ↳ [${tag}] HTTP ${res.status}`);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  console.log(`   ↳ [${tag}] ${buf.length} bytes`);
  return looksLikeXlsx(buf) ? buf : null;
}

async function getDownloadUrl(shareUrl, headers) {
  const enc = 'u!' + b64url(shareUrl);
  const personalMeta = `https://my.microsoftpersonalcontent.com/_api/v2.0/shares/${enc}/driveItem`;
  let res = await fetch(personalMeta, { headers });
  if (res.ok) {
    const meta = await res.json();
    const dl = meta['@content.downloadUrl'] || meta.file?.['@microsoft.graph.downloadUrl'];
    if (dl) return { url: dl, tag: 'badger-personal' };
  } else {
    console.log(`   ↳ [badger-personal-meta] HTTP ${res.status}`);
  }

  res = await fetch(shareUrl, { redirect: 'follow', headers: { ...headers, Accept: 'text/html,*/*' } });
  const finalUrl = res.url;
  console.log(`   ↳ redirect final: ${finalUrl.slice(0, 100)}...`);

  let u;
  try { u = new URL(finalUrl); } catch { return null; }

  const redeem = u.searchParams.get('redeem');
  if (redeem) {
    const redeemMeta = `https://my.microsoftpersonalcontent.com/_api/v2.0/shares/u!${redeem}/driveItem`;
    const r2 = await fetch(redeemMeta, { headers });
    if (r2.ok) {
      const meta = await r2.json();
      const dl = meta['@content.downloadUrl'];
      if (dl) return { url: dl, tag: 'badger-redeem' };
    }
  }

  const resid = u.searchParams.get('resid') || u.searchParams.get('id');
  const authkey = u.searchParams.get('authkey');
  const cid = u.searchParams.get('cid');
  if (resid && authkey && cid) {
    const legacyMeta = `https://api.onedrive.com/v1.0/drives/${cid}/items/${encodeURIComponent(resid)}?authkey=${encodeURIComponent(authkey)}`;
    const r3 = await fetch(legacyMeta, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (r3.ok) {
      const meta = await r3.json();
      const dl = meta['@content.downloadUrl'];
      if (dl) return { url: dl, tag: 'authkey-legacy' };
    }
  }

  return null;
}

async function tryDownload(sheet) {
  console.log(`\n📥 Baixando ${sheet.id} — ${sheet.nome}`);
  try {
    const headers = await getBadgerHeaders();
    const dl = await getDownloadUrl(sheet.url, headers);
    if (dl) {
      const buf = await downloadFromUrl(dl.url, headers, dl.tag);
      if (buf) return buf;
    }
  } catch (e) {
    console.log(`   ↳ [badger] ❌ ${e.message}`);
  }
  return null;
}

async function processSheet(sheet) {
  const buf = await tryDownload(sheet);
  if (!buf) {
    console.log(`   ⛔ Falha ao baixar ${sheet.id}`);
    return [];
  }
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  console.log(`   📗 Abas: ${wb.SheetNames.join(', ')}`);
  let recs = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    const part = rowsToRecords(rows, sheet.id);
    if (part.length) console.log(`   · aba "${sheetName}": ${part.length}`);
    recs = recs.concat(part);
  }
  console.log(`   ✅ ${recs.length} registros (${sheet.id})`);
  return recs;
}

async function main() {
  let all = [];
  const report = [];
  for (const s of SHEETS) {
    const recs = await processSheet(s);
    report.push(`${s.id}: ${recs.length}`);
    all = all.concat(recs);
  }

  const rawTotal = all.length;
  const deduped = dedupeSheetRecords(all);

  console.log(`\n===== FILAS SEGREGADAS =====`);
  console.log(`Bruto (3 planilhas): ${rawTotal}`);
  console.log(`Após dedupe interno: ${deduped.after}`);
  console.log(`Por planilha: B=${deduped.by_sheet.B} JSI=${deduped.by_sheet.JSI} P=${deduped.by_sheet.P}`);
  if (deduped.homonyms.length) {
    console.log(`Homônimos: ${deduped.homonyms.length}`);
  }

  console.log(`\n===== RESUMO =====\n${report.join('\n')}\nTotal: ${deduped.after}`);

  if (!deduped.records.length) {
    console.error('\n⛔ Nenhum registro baixado do OneDrive.');
    process.exit(1);
  }

  const payload = {
    meta: {
      generated_at: new Date().toISOString(),
      source: 'OneDrive (B + JSI + P, filas segregadas)',
      sheets_raw: report,
      raw_total: rawTotal,
      duplicates_removed: deduped.duplicates_removed,
      homonym_warnings: deduped.homonyms.length,
      homonyms: deduped.homonyms.slice(0, 50),
      by_sheet: deduped.by_sheet,
      total: deduped.after,
    },
    records: deduped.records,
  };
  mkdirSync(dirname(OUT) || '.', { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`\n💾 ${OUT} atualizado com ${deduped.after} registros (${deduped.by_sheet.B} B + ${deduped.by_sheet.JSI} JSI + ${deduped.by_sheet.P} P).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
