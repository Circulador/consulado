# Como voltar à versão anterior do site

Este guia serve para **desfazer** melhorias de interface, caso prefira o visual ou o fluxo de antes.

## Onde está o backup?

```
consulado/backup/versao-original-2026-07-15/
├── index.html
├── manifest.json
├── sw.js
└── LEIA-ME-BACKUP.txt
```

**Data do backup:** 15 de julho de 2026  
**Conteúdo:** versão exatamente como estava antes das alterações de UX/UI.

---

## Restaurar em 4 passos (Windows)

1. Abra a pasta `backup\versao-original-2026-07-15`
2. Selecione os três arquivos: `index.html`, `manifest.json`, `sw.js`
3. Copie (Ctrl+C) e cole na pasta principal `consulado` (Ctrl+V)
4. Quando aparecer “Substituir arquivos?”, confirme **Sim**

Depois, abra o site no navegador e pressione **Ctrl+F5** para recarregar sem cache.

---

## Se o site está no GitHub Pages

Peça a quem administra o repositório para:

1. Restaurar os três arquivos (como acima)
2. Enviar para o GitHub (`git add`, `git commit`, `git push`)
3. Aguardar 1–2 minutos e testar o link público

---

## O que NÃO é afetado pela restauração

| Fica igual | Explicação |
|------------|------------|
| Favoritos do usuário | Salvos no navegador (`localStorage`) |
| Progresso da jornada | Também no navegador de cada pessoa |
| Tema claro/escuro | Preferência local |
| Planilha `dados.json` | Arquivo separado; não está no backup |

Ou seja: voltar à versão antiga **não apaga** o acompanhamento pessoal de quem já usou o site.

---

## Restaurar só a página principal

Se quiser manter outras alterações e voltar só o layout:

- Copie **apenas** `index.html` da pasta de backup para a pasta `consulado`.

---

## Dúvidas frequentes

**“Apaguei a pasta backup por engano.”**  
Use o Git: `git checkout HEAD -- index.html manifest.json sw.js` (se ainda não fez commit das mudanças novas), ou peça o histórico no GitHub.

**“O site no celular ainda mostra a versão nova.”**  
Feche o app/PWA, limpe cache do navegador ou reinstale o atalho na tela inicial.

**“Posso ter vários backups?”**  
Sim. Copie a pasta `versao-original-2026-07-15` com outro nome, por exemplo `versao-antes-onboarding-2026-08-01`.
