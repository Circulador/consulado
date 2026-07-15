# Nota: público diverso e princípios para mudanças de UX/UI

Documento de referência **antes** de aplicar as melhorias sugeridas na revisão de design.  
Objetivo: lembrar que a plataforma atende pessoas com níveis muito diferentes de escolaridade e conforto com tecnologia.

---

## Quem usa a ferramenta

| Perfil | Características | O que precisa do site |
|--------|-----------------|------------------------|
| **Idosos / pouca instrução** | Medo de errar, fonte pequena, pouco hábito com apps | Textos grandes, poucos passos, linguagem simples, botões óbvios |
| **Intermediário** | Usa WhatsApp, planilha, busca no Google | Busca clara, explicações curtas, confiança nos avisos “não oficial” |
| **Jovem / fluente em tech** | Quer dados, gráficos, compartilhar link, PWA | Estatísticas, cenários, favoritos, exportar PDF |

**Regra de ouro:** se funcionar bem para quem tem **mais dificuldade**, funciona para todos. O contrário não é verdade.

---

## Princípios para cada mudança (checklist)

Antes de publicar qualquer alteração, perguntar:

1. **Legibilidade** — Texto principal ≥ 16px no celular? Contraste suficiente no tema claro e escuro?
2. **Um caminho claro** — Dá para achar “buscar meu processo” em 5 segundos sem ler manual?
3. **Poucos termos técnicos** — Evitar “localStorage”, “PWA”, “upload .xlsx” sem explicar em linguagem do dia a dia.
4. **Erros gentis** — Trocar `alert()` por mensagens visíveis na tela, com o que fazer em seguida.
5. **Não esconder o essencial** — Painéis avançados (atualizar planilha) podem ficar recolhidos, mas a **busca** nunca.
6. **Toque fácil** — Botões e links com área mínima ~44×44 px (dedo de idoso).
7. **Consistência** — Mesma ação, mesma palavra (ex.: sempre “Buscar”, não alternar com “Pesquisar”).
8. **Avisos oficiais** — Manter visível que não é o Consulado, sem assustar com blocos enormes no topo.

---

## Melhorias sugeridas — prioridade pensando no público amplo

### Fazer primeiro (baixo risco, alto benefício para todos)

- Backup (feito em `backup/versao-original-2026-07-15/`)
- Busca mais visível no topo (sem remover funções)
- Textos de ajuda em frases curtas (“Digite suas iniciais, como RGC”)
- Botões maiores no celular
- Mensagem clara quando o processo não é encontrado

### Fazer com cuidado (testar com alguém mais velho)

- Recolher painel “Atualizar planilha” (mantendo link visível “Como atualizar?”)
- Reduzir emojis ou duplicar com texto escrito
- Onboarding em 3 passos — **opcional**, com botão “Pular” grande

### Evitar ou adiar

- Reorganizar tudo de uma vez (confunde quem já aprendeu o layout)
- Modais complexos sem botão “Fechar” grande
- Atalhos só de teclado
- Remover informações que dão segurança (disclaimers, prazo 730 dias)

---

## Como testar antes de publicar

1. Abrir no celular de alguém com ~60+ anos (ou simular zoom 150%).
2. Pedir: “Encontre sua posição na fila” **sem explicar** — cronometrar e anotar onde travou.
3. Repetir no tema claro (muitos idosos preferem fundo claro).
4. Só então publicar; manter backup datado.

---

## Histórico de backups

| Data | Pasta | Motivo |
|------|-------|--------|
| 2026-07-15 | `versao-original-2026-07-15` | Antes das melhorias de UX/UI |
| 2026-07-15 | *(após commit UX v2)* | Busca no topo, onboarding, a11y, ícones PWA — ver commit no Git |

Adicionar uma linha aqui cada vez que criar um novo backup antes de mudanças grandes.
