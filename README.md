# 🇮🇹 Consultor de Fila Consular — Cidadania Italiana (RJ e ES)

Painel **comunitário** para acompanhar a fila de reconhecimento da cidadania italiana (*Jure Sanguinis*) junto ao Consulado Geral da Itália no Rio de Janeiro.

> ⚠️ **FERRAMENTA NÃO OFICIAL** — Desenvolvida voluntariamente pela comunidade. Somente o [Consulado Italiano no Rio](https://consriodejaneiro.esteri.it/) possui registros oficiais dos processos.

---

## 🌐 Acesso

👉 **[circulador.github.io/consulado](https://circulador.github.io/consulado/)**

Repositório: [github.com/Circulador/consulado](https://github.com/Circulador/consulado)

---

## Como usar (2–3 cliques)

1. **Escolha sua fila** — Balcão (B), JSI ou Pendências (P)
2. **Busque** sua sigla ou data de entrega (ex.: `RGC`, `11/08/2025`)
3. **Veja** posição, dias de espera, probabilidades e gráficos estatísticos

Cada planilha é uma **fila independente**. Quem está no Balcão não compete na fila JSI, e vice-versa.

---

## As 3 filas comunitárias

| Fila | Planilha | O que mede | “Resolvido” = |
|------|----------|------------|---------------|
| **📊 B — Balcão** | Entrega no consulado | Tempo até o e-mail *Já sou Italiano* | Recebeu o JSI |
| **🇮🇹 JSI** | Após o JSI | Tempo até o e-mail PEC de fim da etapa consular | Recebeu a PEC |
| **📎 P — Pendências** | Após envio SEDEX | Tempo até resolução da pendência | Pendência resolvida |

Links OneDrive (atualizados pela comunidade):

- [Planilha B — Balcão](https://1drv.ms/x/c/ba23482b38fbdc1e/EVyxoIPnz65Du-mLBAl7CuUBOsLybUkq3f-TJiOIyW9HBA?e=frZ3Ms)
- [Planilha JSI](https://1drv.ms/x/c/ba23482b38fbdc1e/ETkw9cQ64L5Ko2WicjOlg04BiOc1mm4MLMiqKWcidPm6iA?e=4zXpjS)
- [Planilha P — Pendências](https://1drv.ms/x/c/ba23482b38fbdc1e/EekjF_2Qd5tJoDqaLQ8-IokB436GSnReRCEBHgeuyg72uA?e=az9sGs)

---

## O que a ferramenta faz

### Por fila (B, JSI ou P)

- Painel com **totais só da planilha** (registros, aguardando, resolvidos, mediana KM)
- Busca por **sigla/nome** ou **data de entrega**
- **Posição na fila** — ordem por data de entrega, com aviso de que **não é FIFO**
- **Dias aguardando** e **regime inferido** (rápido, típico, janela de lote, acima do p90)
- **P(concluir em 90d / 180d)** — probabilidades condicionais (Kaplan-Meier)
- Alerta de **processos ultrapassados** (entrega posterior já resolvida)
- **Prazo legal de 730 dias** (somente fila B — Balcão)

### Gráficos estatísticos (por processo)

Bloco colapsável **“Análise estatística da fila”**:

| Gráfico | Valor |
|---------|-------|
| **Curva Kaplan-Meier** | % ainda aguardando ao longo dos dias + marcador do seu processo |
| **Hazard (risco de saída)** | Picos de resolução em lote (~270–300d na B) |
| **Histograma de tempos** | Distribuição dos resolvidos por faixa de dias |
| **Resoluções mensais** | Ritmo observado mês a mês |

### Aba Comunidade

Panorama das 3 filas **sem somar totais** (são etapas diferentes):

- Cards por fila (aguardando, mediana KM, throughput)
- **Throughput B vs JSI vs P** — visualiza o gargalo JSI
- **Curvas KM comparadas** das 3 filas
- **Histograma comparativo** de tempos de resolução

### Recursos pessoais

- **Favoritos** e **compartilhar link** (`?sheet=B&proc=RGC`)
- **Minha jornada** — 16 etapas do agendamento até passaporte/CIE (salvo no navegador)
- Exportar jornada em PDF
- Tema claro/escuro · PWA (instalar como app)

---

## Design

- **Topo:** cores da bandeira italiana (verde, branco, vermelho) + avisos **NÃO OFICIAL** no cabeçalho e rodapé
- **Corpo:** tema **Mediterrâneo** (terracota, papiro, sálvia) — distinto do azul genérico
- **Ícone:** ampulheta com faixa tricolor (comunidade, espera na fila)

---

## Dados e sincronização

- Planilhas **atualizadas manualmente no OneDrive** por um responsável da comunidade
- O site baixa **B + JSI + P** separadamente — **sem misturar filas**
- Duplicatas exatas na mesma planilha são removidas; **homônimos** (mesma sigla, datas diferentes) são preservados
- Sincronização automática a cada **6 h** (GitHub Actions) + botão **Atualizar planilha** na tela da fila
- Fallback: arquivo `dados.json` no repositório
- Estatísticas avançadas: `insights.json` (Kaplan-Meier, hazard, FIFO)

---

## Estrutura do projeto

```text
consulado/
├── index.html              # App (HTML + CSS + JS + gráficos Chart.js)
├── dados.json              # Base gerada automaticamente (3 filas segregadas)
├── insights.json           # Análise estatística (KM, hazard, FIFO)
├── scripts/
│   ├── gerar-dados.mjs     # Download OneDrive + geração do JSON
│   ├── merge-records.mjs   # Dedupe por planilha (sem merge cross-sheet)
│   ├── analise_consulado.py
│   ├── gerar-icones.mjs    # Ícones PWA
│   └── insights.json       # Fonte da análise (cópia para raiz)
├── .github/workflows/
│   └── atualizar-dados.yml # Cron 6 h + execução manual
├── manifest.json
├── sw.js
├── package.json
└── README.md
```

### Desenvolvimento local

```bash
npm install
node scripts/gerar-dados.mjs   # Regenera dados.json do OneDrive
node scripts/gerar-icones.mjs  # Regenera ícones PWA
```

---

## Privacidade

Favoritos, progresso da jornada e preferências ficam apenas no **localStorage** do seu navegador. Nada é enviado a servidores externos pela aplicação.

---

## ⚠️ Aviso legal

Informações **colaborativas** — podem estar incompletas ou desatualizadas. Projeções e gráficos têm caráter **estimativo** com base em planilhas parciais. O Consulado Geral da Itália é a **única fonte oficial**.

---

*Feito com ❤️ pela comunidade, para a comunidade.*

**In bocca al lupo a tutti! 🇮🇹🍀**
