# 🇮🇹 Consultor de Fila Consular — Cidadania Italiana (RJ e ES)

Painel **comunitário** para acompanhar a fila de reconhecimento da cidadania italiana (*Jure Sanguinis*) junto ao Consulado Geral da Itália no Rio de Janeiro.

> ⚠️ **FERRAMENTA NÃO OFICIAL** — Desenvolvida voluntariamente pela comunidade. Somente o Consulado possui registros oficiais dos processos.

---

## 🌐 Acesso

👉 **[circulador.github.io/consulado](https://circulador.github.io/consulado/)**

Repositório: [github.com/Circulador/consulado](https://github.com/Circulador/consulado)

---

## Como usar (2–3 cliques)

1. **Escolha sua fila** — Balcão, JSI ou Pendências
2. **Busque** sua sigla ou data de entrega (ex.: `RGC`, `11/08/2025`)
3. **Veja** posição na fila, dias de espera e previsão estimada

Cada planilha é uma **fila independente**. Quem está no Balcão não compete na fila JSI, e vice-versa.

---

## As 3 filas comunitárias

| Fila | Planilha | O que mede | “Resolvido” = |
|------|----------|----------|---------------|
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

- Busca por **sigla/nome** ou **data de entrega**
- **Posição na fila** — calculada só entre processos da mesma planilha
- **Dias de espera** e previsão em 3 cenários (otimista, realista, conservador)
- Índice de **confiabilidade** da estimativa
- Gráfico de **resoluções mensais** da fila escolhida
- **Prazo legal de 730 dias** (somente fila B — Balcão)

### Recursos pessoais

- **Favoritos** e **compartilhar link** (`?sheet=B&proc=RGC`)
- **Minha jornada** — 16 etapas do agendamento até passaporte/CIE (salvo no navegador)
- Exportar jornada em PDF
- Tema claro/escuro · PWA (instalar como app)

---

## Dados e sincronização

- As planilhas são **atualizadas manualmente no OneDrive** por um responsável da comunidade
- O site baixa **B + JSI + P** separadamente — **sem misturar filas**
- Duplicatas exatas na mesma planilha são removidas; **homônimos** (mesma sigla, datas diferentes) são preservados
- Sincronização automática a cada **6 h** (GitHub Actions) + botão **Atualizar agora** no site
- Fallback: arquivo `dados.json` no repositório

---

## Estrutura do projeto

```text
consulado/
├── index.html              # App (HTML + CSS + JS)
├── dados.json              # Base gerada automaticamente
├── scripts/
│   ├── gerar-dados.mjs     # Download OneDrive + geração do JSON
│   └── merge-records.mjs   # Dedupe por planilha (sem merge cross-sheet)
├── .github/workflows/
│   └── atualizar-dados.yml # Cron 6 h + execução manual
├── manifest.json
├── sw.js
└── README.md
```

---

## Privacidade

Favoritos, progresso da jornada e preferências ficam apenas no **localStorage** do seu navegador. Nada é enviado a servidores externos pela aplicação.

---

## ⚠️ Aviso

Informações **colaborativas** — podem estar incompletas ou desatualizadas. Projeções têm caráter **estimativo**. O Consulado Geral da Itália é a **única fonte oficial**.

---

*Feito com ❤️ pela comunidade, para a comunidade.*

**In bocca al lupo a tutti! 🇮🇹🍀**
