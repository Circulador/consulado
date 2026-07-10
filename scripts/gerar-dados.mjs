// scripts/gerar-dados.mjs  (v2 — diagnóstico + múltiplas estratégias de download)
// Baixa a Planilha B do OneDrive e gera dados.json na raiz do repositório.
// Roda no servidor do GitHub Actions => sem CORS e sem login (se o link for público).
//
// Node 20+ (fetch nativo). Dependência única: xlsx.

import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SHEETS = [
  {
    id: 'B',
    nome: 'Planilha B — Balcão',
    url: 'https://1drv.ms/x/c/ba23482b38fbdc1e/EVyxoIPnz65Du-mLBAl7CuUBOsLybUkq3f-TJiOIyW9HBA?e=frZ3Ms',
    base: true,
  },
];

// Gera na raiz (mesma pasta do index.html). Se o index estiver em /docs, troque para 'docs/dados.json'.
const OUT = 'dados.json';

// ---------- utilidades de data ----------
function p2(n) { return String(n).padStart(2, '0'); }
function isoFromCell(v) {
  if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}`;
  if (typeof v === 'number' && v > 30000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5);
    return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  }
  if (typeof v === 'string') {
    const m = v.match(/^(\d{1,2})\d{1,2}\d{2,4}$/);
    if (m) { let [, d, mo, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${p2(+mo)}-${p2(+d)}`; }
  }
  return null;
}

const BAD = /^(MEDIA|MÉDIA|MENOR|MAIOR|TOTAL|ULTIMO|ÚLTIMO|ESTAMOS|DATA DE|NOME|RECEBIDO|GRUPO|N[ºo°]|B PLAN|PLANILHA|ATUALIZAD|DIAS)/i;

function rowsToRecords(rows, pid) {
  const recs = [];
  for (const r of rows) {
    if (!r || r.length < 2) continue;
    const entrega = isoFromCell(r[0]);
    const nome = typeof r[1] === 'string' ? r[1].trim() : '';
    if (!entrega || !nome || BAD.test(nome)) continue;
    const resol = isoFromCell(r[4]);
    recs.push({ entrega, nome: nome.replace(/\s+/g, ' '), grupo: r[2] != null ? String(r[2]).trim() || '-' : '-', resol: resol || null, planilha: pid, origem: pid });
  }
  return recs;
}

// ---------- estratégias de download ----------
function b64url(s) { return Buffer.from(s, 'utf-8').toString('base64').replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-'); }

function downloadUrls(shareUrl) {
  const enc = 'u!' + b64url(shareUrl);
  const withDl = shareUrl.includes('?') ? shareUrl + '&download=1' : shareUrl + '?download=1';
  return [
    { tag: 'api.shares/root/content', url: `https://api.onedrive.com/v1.0/shares/${enc}/root/content` },
    { tag: 'api.shares/driveItem/content', url: `https://api.onedrive.com/v1.0/shares/${enc}/driveItem/content` },
    { tag: '1drv.ms?download=1', url: withDl },
  ];
}

function looksLikeXlsx(buf) {
  // xlsx é um zip => começa com "PK" (0x50 0x4B)
  return buf && buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4B;
}

async function tryDownload(sheet) {
  const attempts = downloadUrls(sheet.url);
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (GitHubActions)' } });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) { console.log(`   ↳ [${a.tag}] HTTP ${res.status} (${ct})`); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`   ↳ [${a.tag}] HTTP 200 · ${buf.length} bytes · ${ct}`);
      if (looksLikeXlsx(buf)) { console.log(`   ↳ [${a.tag}] ✅ é um XLSX válido (assinatura PK)`); return buf; }
      const head = buf.slice(0, 120).toString('utf-8').replace(/\s+/g, ' ');
      console.log(`   ↳ [${a.tag}] ⚠️ não é XLSX. Início do conteúdo: "${head}"`);
    } catch (e) {
      console.log(`   ↳ [${a.tag}] ❌ ${e.message}`);
    }
  }
  return null;
}

async function processSheet(sheet) {
  console.log(`\n📥 Baixando ${sheet.id} — ${sheet.nome}`);
  const buf = await tryDownload(sheet);
  if (!buf) { console.log(`   ⛔ Nenhuma estratégia trouxe um XLSX para ${sheet.id}.`); return []; }
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  console.log(`   📗 Abas encontradas: ${wb.SheetNames.join(', ')}`);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  console.log(`   📊 Linhas lidas na 1ª aba: ${rows.length}`);
  rows.slice(0, 3).forEach((r, i) => console.log(`      linha[${i}] = ${JSON.stringify((r || []).slice(0, 6))}`));
  const recs = rowsToRecords(rows, sheet.id);
  console.log(`   ✅ Registros válidos extraídos: ${recs.length}`);
  return recs;
}

async function main() {
  let base = [];
  const report = [];
  for (const s of SHEETS) {
    const recs = await processSheet(s);
    report.push(`${s.id}: ${recs.length} registros`);
    if (s.base) base = recs;
  }

  console.log(`\n===== RESUMO =====\n${report.join('\n')}`);

  if (!base.length) {
    console.error('\n⛔ 0 registros da Planilha B. Não vou sobrescrever o dados.json com vazio.');
    console.error('   Veja os logs acima: se apareceu "não é XLSX", o link não está entregando o arquivo puro.');
    process.exit(1);
  }

  const payload = {
    meta: { generated_at: new Date().toISOString(), source: 'OneDrive (GitHub Actions)', total: base.length },
    records: base,
  };
  mkdirSync(dirname(OUT) || '.', { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`\n💾 Gerado ${OUT} com ${base.length} registros.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
