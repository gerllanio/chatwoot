# Work — GTI Tecnologia

Este branch (`gti`) é o **Work**, o sistema de atendimento da GTI, construído sobre o
[Chatwoot fazer.ai](https://github.com/fazer-ai/chatwoot) (que acompanha o Chatwoot oficial).

## Como as atualizações entram

- `main` espelha o `fazer-ai/chatwoot` (botão **Sync fork** no GitHub).
- `gti` recebe o `main` por merge: `git checkout gti && git merge main`.
- As mudanças da GTI ficam em arquivos próprios sempre que possível, para o merge não dar conflito:
  - `app/javascript/dashboard/helper/gtiSidebarMenu.js`: lateral no estilo Ticketz
  - `app/javascript/dashboard/assets/scss/_gti-theme.scss`: cores da GTI
  - `app/javascript/dashboard/i18n/fazer-ai/locale/*/gti.json`: textos (pt_BR, en, es)
  - `.github/workflows/gti_docker.yml`: imagem `ghcr.io/gerllanio/chatwoot:gti`
- Arquivos do upstream alterados (poucas linhas): `components-next/sidebar/Sidebar.vue`,
  `assets/scss/_woot.scss`, `theme/colors.js`.

## Etapas

1. ✅ Base: branch, imagem automática, cores da GTI, lateral estilo Ticketz, versão no rodapé
2. Tela de Atendimentos estilo Ticketz (abas Atendendo/Aguardando/Resolvidos, Aceitar, Espiar, Finalizar)
3. Avisos empilhados, volume de notificação, contador na guia, histórico acinzentado
4. Transcrição de áudio pela Groq, envio de foto/vídeo/áudio
5. Painel, modo monitor (TV), Kanban de conversas
6. Tarefas, E-mail com caixas e pastas, Financeiro, Ajuda
7. Integração com o Primata

Protótipo aprovado: https://claude.ai/artifact/BZyoXVvihjS1H7vK37La3m
