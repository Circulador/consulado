import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { dedupeSheetRecords, normNome, recordId } from './merge-records.mjs';
import {
  blendHybridDays,
  computePositionProjection,
  computeRollingThroughput,
  dataAgeDays,
  kmRemainingDays,
  qualityLevel,
  rollingMonthKeys,
} from './lib/stats.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function test(name, fn) {
  try {
    fn();
    console.log('ok', name);
  } catch (e) {
    console.error('FAIL', name, e.message);
    process.exitCode = 1;
  }
}

test('rollingMonthKeys retorna 12 meses', () => {
  const keys = rollingMonthKeys(12, new Date('2026-07-17'));
  assert.equal(keys.length, 12);
  assert.equal(keys[keys.length - 1].key, '2026-07');
});

test('computeRollingThroughput usa janela movel', () => {
  const mc = {
    '2026-05': 10,
    '2026-06': 8,
    '2026-07': 12,
  };
  const t = computeRollingThroughput(mc, new Date('2026-07-17'));
  assert.equal(t.thrMedTrim, 10);
  assert.equal(t.thrPico, 12);
});

test('computePositionProjection calcula ETA', () => {
  const p = computePositionProjection({
    ahead: 16,
    thrPico: 12,
    thrMedTrim: 10,
    thrSem: 8,
    consRate: 6,
    today: new Date('2026-07-17'),
  });
  assert.ok(p.real.d > 0);
  assert.ok(p.cons.d >= p.real.d || p.cons.d > 0);
});

test('blendHybridDays combina posicao e KM', () => {
  assert.equal(blendHybridDays(120, 80, 0.5), 100);
  assert.equal(blendHybridDays(120, null), 120);
});

test('kmRemainingDays nao negativo', () => {
  assert.equal(kmRemainingDays(287, 340), 0);
  assert.equal(kmRemainingDays(287, 200), 87);
});

test('qualityLevel por amostra', () => {
  assert.equal(qualityLevel(10), 'low');
  assert.equal(qualityLevel(25), 'medium');
  assert.equal(qualityLevel(50), 'high');
});

test('dedupeSheetRecords preserva homonimos', () => {
  const input = [
    { planilha: 'B', entrega: '2025-08-11', nome: 'RGC', grupo: '-' },
    { planilha: 'B', entrega: '2025-09-19', nome: 'RGC', grupo: '-' },
    { planilha: 'B', entrega: '2025-08-11', nome: 'RGC', grupo: '-' },
  ];
  const out = dedupeSheetRecords(input);
  assert.equal(out.after, 2);
  assert.equal(out.homonyms.length, 1);
  assert.equal(out.homonyms[0].nome, 'RGC');
});

test('recordId segregado por planilha', () => {
  const a = recordId({ planilha: 'B', entrega: '2025-01-01', nome: 'X' });
  const b = recordId({ planilha: 'JSI', entrega: '2025-01-01', nome: 'X' });
  assert.notEqual(a, b);
});

test('dados.json tem meta e filas segregadas', () => {
  const payload = JSON.parse(readFileSync(join(root, 'dados.json'), 'utf8'));
  assert.ok(payload.meta);
  assert.ok(Array.isArray(payload.records));
  const sheets = new Set(payload.records.map((r) => r.planilha));
  assert.ok(sheets.has('B'));
  assert.ok(sheets.has('JSI'));
  assert.ok(!payload.meta.source?.toLowerCase().includes('merge'));
});

test('insights.json tem survival por fila', () => {
  const ins = JSON.parse(readFileSync(join(root, 'insights.json'), 'utf8'));
  assert.ok(ins.survival?.B);
  assert.ok(ins.survival?.JSI);
});

test('dataAgeDays', () => {
  const today = new Date(2026, 6, 17);
  assert.equal(dataAgeDays('2026-07-17T12:00:00Z', today), 0);
  assert.equal(dataAgeDays('2026-07-15T12:00:00Z', today), 2);
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log('\nTodos os testes passaram.');
