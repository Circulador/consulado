#!/usr/bin/env python3
"""
Fetch sheets from OneDrive and generate dados.json
Designed to run via GitHub Actions
"""

import json
import sys
from datetime import datetime
from io import BytesIO
from urllib.request import urlopen

try:
    import openpyxl
    from openpyxl.utils import get_column_letter
except ImportError:
    print("❌ openpyxl não instalado. Execute: pip install openpyxl")
    sys.exit(1)


# URLs das planilhas (convertidas para download direto)
SHEETS = {
    'B': 'https://1drv.ms/x/c/ba23482b38fbdc1e/EVyxoIPnz65Du-mLBAl7CuUBOsLybUkq3f-TJiOIyW9HBA?download=1',
    'JSI': 'https://1drv.ms/x/c/ba23482b38fbdc1e/ETkw9cQ64L5Ko2WicjOlg04BiOc1mm4MLMiqKWcidPm6iA?download=1',
    'P': 'https://1drv.ms/x/c/ba23482b38fbdc1e/EekjF_2Qd5tJoDqaLQ8-IokB436GSnReRCEBHgeuyg72uA?download=1',
}


def normalize_date(val):
    """Convert Excel date to ISO 8601 string (YYYY-MM-DD)"""
    if not val:
        return None
    if isinstance(val, str):
        # Try common date formats
        for fmt in ['%d/%m/%Y', '%d/%m/%y', '%Y-%m-%d']:
            try:
                dt = datetime.strptime(val.strip(), fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                pass
        return None
    if isinstance(val, datetime):
        return val.strftime('%Y-%m-%d')
    return None


def download_sheet(url):
    """Download Excel file from OneDrive"""
    try:
        print(f"⏳ Baixando de {url[:50]}...")
        with urlopen(url, timeout=15) as response:
            return BytesIO(response.read())
    except Exception as e:
        print(f"❌ Erro ao baixar: {e}")
        return None


def parse_excel_sheet(buffer, sheet_name):
    """Parse Excel worksheet and extract records"""
    try:
        wb = openpyxl.load_workbook(buffer, data_only=True)
        
        # Tenta encontrar a sheet (por nome ou índice)
        if sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
        else:
            ws = wb.active
        
        records = []
        skip_patterns = ['MEDIA', 'MÉDIA', 'MAIOR', 'MENOR', 'TOTAL', 'RECEBIDO', 'ATUALIZ', 'DATA DE', 'NOME']
        
        for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not row or not any(row):
                continue
            
            # Extrai colunas esperadas
            # Tipicamente: Nº | Nome | Sigla | Data de Entrega | Resolução | Grupo
            nome = row[1] if len(row) > 1 else None
            sigla = row[2] if len(row) > 2 else None
            entrega = row[3] if len(row) > 3 else None
            resol = row[4] if len(row) > 4 else None
            grupo = row[5] if len(row) > 5 else None
            
            # Limpa valores
            nome_str = str(nome).strip() if nome else ''
            sigla_str = str(sigla).strip() if sigla else ''
            
            # Pula linhas vazias ou de cabeçalho
            if not nome_str or any(p.upper() in nome_str.upper() for p in skip_patterns):
                continue
            
            # Normaliza datas
            entrega_iso = normalize_date(entrega)
            resol_iso = normalize_date(resol) if resol else None
            
            if not entrega_iso:
                continue
            
            record = {
                'entrega': entrega_iso,
                'nome': sigla_str or nome_str,
                'grupo': str(grupo).strip() if grupo else '1',
                'resol': resol_iso,
                'planilha': sheet_name,
            }
            
            records.append(record)
        
        return records
    
    except Exception as e:
        print(f"❌ Erro ao processar Excel: {e}")
        return []


def consolidate_data():
    """Download all sheets and consolidate"""
    all_records = []
    
    for sheet_name, url in SHEETS.items():
        print(f"\n📊 Processando planilha {sheet_name}...")
        buffer = download_sheet(url)
        if buffer:
            records = parse_excel_sheet(buffer, sheet_name)
            print(f"   ✅ {len(records)} registros lidos")
            all_records.extend(records)
        else:
            print(f"   ⚠️  Falha ao baixar {sheet_name}")
    
    # Remove duplicatas (mantém primeira ocorrência)
    seen = set()
    unique_records = []
    for r in all_records:
        key = (r['entrega'], r['nome'])
        if key not in seen:
            seen.add(key)
            unique_records.append(r)
    
    print(f"\n📈 Total consolidado: {len(unique_records)} registros únicos")
    return unique_records


def save_json(records, filename='dados.json'):
    """Save consolidated data to JSON"""
    payload = {
        'meta': {
            'generated_at': datetime.utcnow().isoformat() + 'Z',
            'source': 'GitHub Actions + OneDrive',
            'count': len(records),
        },
        'records': records,
    }
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Salvo: {filename} ({len(records)} registros)")


if __name__ == '__main__':
    try:
        records = consolidate_data()
        save_json(records)
        print("\n🎉 Pronto! dados.json atualizado com sucesso")
    except Exception as e:
        print(f"\n❌ Erro fatal: {e}")
        sys.exit(1)
