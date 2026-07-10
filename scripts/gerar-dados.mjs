// scripts/gerar-dados.mjs
// Baixa as 3 planilhas do OneDrive (links de compartilhamento) e gera public/dados.json
// Executado pelo GitHub Actions. Roda no servidor => SEM CORS e SEM login,
// desde que os links sejam "qualquer pessoa com o link pode ver".
//
// Node 20+ (fetch nativo). Dependência única: xlsx.

import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---- Configuração das planilhas ----
const SHEETS = [
  {
    id: 'B',
    nome: 'Planilha B — Balcão',
    url: 'https://1drv.ms/x/c/ba23482b38fbdc1e/EVyxoIPnz65Du-mLBAl7CuUBOsLybUkq3f-TJiOIyW9HBA?e=frZ3Ms',
    base: true,   // define a base principal da análise
  },
  {
    id: 'JSI',
    nome: 'Planilha JSI — Já sou Italiano',
    url: 'https://1drv.ms/x/c/ba23482b38fbdc1e/ETkw9cQ64L5Ko2WicjOlg04BiOc1mm4MLMiqKWcidPm6iA?e=4zXpjS',
    base: false,
  },
  {
    id: 'P',
    nome: 'Planilha P — Pendências',
    url: 'https://1drv.ms/x/c/ba23482b38fbdc1e/EekjF_2Qd5tJoDqaLQ8-IokB436GSnReRCEBHgeuyg72uA?e=az9sGs',
    base: false,
  },
];

// Gera na raiz do repositório (mesmo lugar do index.html, que o site busca via ./dados.json).
// Se seu index.html estiver em outra pasta, ajuste aqui (ex.: 'docs/dados.json').
const OUT = 'dados.json';

// ---- Utilidades ----
// Converte um link de compartilhamento do OneDrive na URL de download direto
// via API pública de "shares" (funciona no servidor, sem token, se o link for público).
function odDirectUrl(shareUrl) {
  const b64 = Buffer.from(shareUrl, 'utf-8').toString('base64');
  const enc = 'u!' + b64.replace(/=+$/, '').replace(/\//g, '_').replace(/\+/g, '-');
  return `https://api.onedrive.com/v1.0/shares/${enc}/root/content`;
}

function p2(n) { return String(n).padStart(2, '0'); }

// Serial do Excel / Date -> 'YYYY-MM-DD'
function isoFromCell(v) {
  if (v instanceof Date && !isNaN(v)) {
    return `${v.getFullYear()}-${p2(v.getMonth() + 1)}-${p2(v.getDate())}`;
  }
  if (typeof v === 'number' && v > 30000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5);
    return `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}`;
  }
  if (typeof v === 'string') {
    // tenta dd/mm/aaaa
    const m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      let [, d, mo, y] = m;
      if (y.length === 2) y = '20' + y;
      return `${y}-${p2(+mo)}-${p2(+d)}`;
    }
  }
  return null;
}

const BAD = /^(MEDIA|MÉDIA|MENOR|MAIOR|TOTAL|ULTIMO|ÚLTIMO|ESTAMOS|DATA DE|NOME|RECEBIDO|GRUPO|N[ºo°]|B PLAN|PLANILHA|ATUALIZAD|DIAS)/i;

// Converte linhas da planilha em registros no formato que o site espera
function rowsToRecords(rows, planilhaId) {
  const recs = [];
  for (const r of rows) {
    if (!r || r.length < 2) continue;
    const entrega = isoFromCell(r[0]);
    const nome = typeof r[1] === 'string' ? r[1].trim() : '';
    if (!entrega || !nome || BAD.test(nome)) continue;
    const resol = isoFromCell(r[4]);
    recs.push({
      entrega,
      nome: nome.replace(/\s+/g, ' '),
      grupo: r[2] != null ? String(r[2]).trim() || '-' : '-',
      resol: resol || null,
      planilha: planilhaId,
      origem: planilhaId,
    });
  }
  return recs;
}

async function fetchXlsx(sheet) {
  const direct = odDirectUrl(sheet.url);
  const res = await fetch(direct, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${sheet.id}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/html')) throw new Error(`${sheet.id}: retornou HTML (link não é público?)`);
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  return rowsToRecords(rows, sheet.id);
}

async function main() {
  let base = [];
  const report = [];
  for (const s of SHEETS) {
    try {
      const recs = await fetchXlsx(s);
      report.push(`✅ ${s.id}: ${recs.length} registros`);
      if (s.base) base = recs;
      // (JSI e P podem ser usadas futuramente; hoje a análise usa a base B)
    } catch (e) {
      report.push(`⚠️ ${s.id}: ${e.message}`);
    }
  }

  if (!base.length) {
    console.error('Nenhum registro da Planilha B foi obtido. Abortando para não sobrescrever com vazio.');
    console.error(report.join('\n'));
    process.exit(1);
  }

  const payload = {
    meta: {
      generated_at: new Date().toISOString(),
      source: 'OneDrive (GitHub Actions)',
      sheets: report,
      total: base.length,
    },
    records: base,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`Gerado ${OUT} com ${base.length} registros.`);
  console.log(report.join('\n'));
}

main().catch((e) => { console.error(e); process.exit(1); });
