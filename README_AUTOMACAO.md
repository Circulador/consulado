#!/usr/bin/env python3
"""Atualiza dados.json a partir das 3 planilhas publicas do OneDrive.

Esta rotina roda no GitHub Actions, fora do navegador. Assim evita CORS do OneX porque
quem baixa a planilha e o runner do GitHub, e o site apenas consome dados.json.
"""
from __future__ import annotations
import base64
import datetime as dt
import io
import json
import math
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import requests
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
SOURCES_FILE = ROOT / "sources.json"
OUT_FILE = ROOT / "dados.json"
RAW_DIR = ROOT / "docs" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

BAD_NAME_RE = re.compile(r"^(MEDIA|MÉDIA|MENOR|MAIOR|TOTAL|ULTIMO|ÚLTIMO|ESTAMOS|DATA DE|NOME|RECEBIDO|GRUPO|N[ºo°]|B PLAN|PLANILHA|ATUALIZAD|DIAS)", re.I)
PRIORITY = {"B": 1, "JSI": 2, "P": 3}


def encode_share_url(url: str) -> str:
    token = base64.urlsafe_b64encode(url.encode("utf-8")).decode("ascii").rstrip("=")
    return "u!" + token


def candidate_urls(url: str) -> List[str]:
    # 1) Public OneDrive share endpoint. Often works in server-side environments.
    # 2) Original URL as fallback. requests follows redirects.
    return [
        f"https://api.onedrive.com/v1.0/shares/{encode_share_url(url)}/root/content",
        url,
    ]


def download_xlsx(stage: str, url: str) -> bytes:
    headers = {
        "User-Agent": "Mozilla/5.0 GitHubActions fila-consulado-updater",
        "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*",
    }
    last_error: Optional[Exception] = None
    for candidate in candidate_urls(url):
        try:
            r = requests.get(candidate, headers=headers, timeout=60, allow_redirects=True)
            r.raise_for_status()
            content = r.content
            # XLSX files are ZIP containers and usually start with PK.
            if not content.startswith(b"PK"):
                text_head = content[:250].decode("utf-8", errors="ignore")
                raise ValueError(f"Resposta nao parece XLSX. Inicio: {text_head[:120]!r}")
            (RAW_DIR / f"{stage}.xlsx").write_bytes(content)
            return content
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise RuntimeError(f"Falha ao baixar {stage}: {last_error}")


def iso_from_cell(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, dt.datetime):
        return value.date().isoformat()
    if isinstance(value, dt.date):
        return value.isoformat()
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        # Excel serial date. Excel epoch compatible with JS code used in the site.
        if value > 30000 and math.isfinite(value):
            base = dt.datetime(1899, 12, 30)
            return (base + dt.timedelta(days=int(round(value)))).date().isoformat()
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return None
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return dt.datetime.strptime(s[:10], fmt).date().isoformat()
            except ValueError:
                pass
    return None


def clean_name(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def records_from_xlsx(stage: str, payload: bytes) -> List[Dict[str, Any]]:
    wb = load_workbook(io.BytesIO(payload), data_only=True, read_only=True)
    records: List[Dict[str, Any]] = []
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            if not row or len(row) < 2:
                continue
            entrega = iso_from_cell(row[0])
            nome = clean_name(row[1])
            if not entrega or not nome or BAD_NAME_RE.search(nome):
                continue
            grupo = clean_name(row[2]) if len(row) > 2 else "-"
            resol = iso_from_cell(row[4]) if len(row) > 4 else None
            records.append({
                "entrega": entrega,
                "nome": nome,
                "grupo": grupo or stage or "-",
                "resol": resol,
                "planilha": stage,
                "origem": stage,
                "aba": ws.title,
            })
    return records


def dedupe(records: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    merged: Dict[str, Dict[str, Any]] = {}
    for rec in records:
        key = f"{rec.get('nome','').strip().upper()}|{rec.get('entrega','')}"
        if not key.strip("|"):
            continue
        old = merged.get(key)
        if old is None or PRIORITY.get(rec.get("planilha"), 0) >= PRIORITY.get(old.get("planilha"), 0):
            merged[key] = rec
    return sorted(merged.values(), key=lambda r: (r.get("entrega") or "", r.get("nome") or ""))


def main() -> int:
    cfg = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
    all_records: List[Dict[str, Any]] = []
    source_stats: Dict[str, Any] = {}
    errors: Dict[str, str] = {}

    for src in cfg["sources"]:
        stage = src["stage"]
        url = src["url"]
        try:
            payload = download_xlsx(stage, url)
            records = records_from_xlsx(stage, payload)
            all_records.extend(records)
            source_stats[stage] = {"records": len(records), "status": "ok"}
            print(f"{stage}: {len(records)} registros")
        except Exception as exc:  # noqa: BLE001
            errors[stage] = str(exc)
            source_stats[stage] = {"records": 0, "status": "error", "error": str(exc)}
            print(f"ERRO {stage}: {exc}", file=sys.stderr)

    merged = dedupe(all_records)
    if not merged:
        raise SystemExit("Nenhum registro gerado. Mantendo falha para nao publicar JSON vazio.")

    generated_at = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    payload = {
        "meta": {
            "generated_at": generated_at,
            "source": "onedrive-public-links-via-github-actions",
            "total_records": len(merged),
            "source_stats": source_stats,
            "errors": errors,
        },
        "records": merged,
    }
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"dados.json atualizado: {len(merged)} registros")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
