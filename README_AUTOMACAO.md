# Automação da Fila Consulado

Este pacote implementa a arquitetura definitiva para evitar CORS do OneDrive:

```text
OneDrive public links
        ↓
GitHub Actions
        ↓
dados.json
        ↓
GitHub Pages / index.html
```

## Arquivos incluídos

- `index.html` — site atualizado para ler `dados.json` automaticamente.
- `dados.json` — arquivo de dados consumido pelo site. Começa vazio e é atualizado pelo workflow.
- `sources.json` — contém as 3 URLs fixas do OneDrive.
- `scripts/update_data.py` — baixa as planilhas, converte XLSX para JSON e gera `dados.json`.
- `.github/workflows/update-data.yml` — workflow manual e agendado do GitHub Actions.
- `requirements.txt` — dependências Python.

## Como publicar

1. Copie todos os arquivos e pastas deste pacote para a raiz do repositório do GitHub Pages.
2. Faça commit e push.
3. No GitHub, abra a aba **Actions**.
4. Execute manualmente o workflow **Atualizar dados da fila**.
5. Após o workflow concluir, o arquivo `dados.json` será atualizado no repositório.
6. O site passará a carregar `dados.json` automaticamente.

## Como testar no navegador

Abra o site normalmente. Ele deve mostrar:

```text
✅ dados.json carregado
```

Se quiser ignorar o JSON e usar a base embutida no HTML, abra com:

```text
?nojson=1
```

## Observação importante

O navegador não baixa mais o Excel diretamente do OneDrive. Isso é intencional para evitar CORS. O download acontece no GitHub Actions, fora do navegador.
