# CRM Flying Imports

Protótipo comercial em português, React + Vite, com função Node compatível com Vercel.

## Executar

```sh
npm install
npm run dev
```

Abra http://127.0.0.1:5173. `npm run build` gera `dist`; `npm test` verifica regras de contatos, segmentação, público autorizado e conflitos.

## O que funciona sem configuração

- Dashboard calculado sobre 26 contatos (24 fictícios e 2 autorizados), com gráficos atualizados pela base.
- Busca por nome e telefone, filtros combinados, cadastro e edição com chave de telefone normalizada.
- Segmentos salvos e reutilizáveis.
- Kanban com 12 oportunidades, edição e movimentação por arrastar ou seletor de etapa.
- Campanhas em três passos, prévia com `{nome}`, texto e prévia de uma mídia via URL HTTPS.
- Rascunhos editáveis e simulação explicitamente identificada, sem mensagens reais.
- Contatos, segmentos, oportunidades e campanhas demonstrativas persistem em localStorage por navegador. Não é uma base compartilhada entre visitantes.
- Exportação JSON da base.

## Planilha demonstrativa criada

[CRM Flying Imports — Base demonstrativa](https://docs.google.com/spreadsheets/d/1np85HlBvIbnVI1eVLWEnTKqzR4tLpMti_fS1OfCYea4/edit?usp=drivesdk)

Aba `Contatos`, cabeçalhos em A1:M1:

`nome`, `telefone`, `cidade`, `estado`, `origem`, `times_interesse`, `tipos_camisa`, `tamanho`, `ja_comprou`, `ultima_compra`, `observacoes`, `atualizado_em`, `demonstrativo`.

- Telefones são texto com `+55` e DDD. Os fictícios usam DDD `00`, não discável.
- Múltiplos interesses: valores separados por ponto e vírgula, por exemplo `Flamengo; Palmeiras`.
- `ja_comprou` e `demonstrativo`: `sim` ou `não`.
- `ultima_compra`: `YYYY-MM-DD` ou vazio. Sem data, nunca entra em inativos.
- `atualizado_em`: data/hora; novas gravações do CRM usam ISO 8601.
- A integração aceita até 999 contatos nesta versão.

A criação da planilha foi validada pelo conector. A conexão do aplicativo requer as credenciais abaixo e ainda não foi testada com a conta de serviço.

## Configurar conexões reais

Copie `.env.example` para `.env.local` no desenvolvimento. Na Vercel, configure as mesmas chaves em Settings → Environment Variables. Não use prefixo `VITE_` para segredos.

| Variável                       | Uso                                                         |
| ------------------------------ | ----------------------------------------------------------- |
| `PRESENTER_PASSWORD`           | Senha forte do apresentador; libera integrações pelo painel |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail de conta de serviço com Google Sheets API habilitada |
| `GOOGLE_PRIVATE_KEY`           | Chave privada da conta, com quebras reais ou `\n`           |
| `GOOGLE_SHEET_ID`              | `1np85HlBvIbnVI1eVLWEnTKqzR4tLpMti_fS1OfCYea4`              |
| `UAZAPI_URL`                   | URL HTTPS da instância ATM+                                 |
| `UAZAPI_TOKEN`                 | Token da instância                                          |
| `UPSTASH_REDIS_REST_URL`       | Endpoint Redis REST para persistência e idempotência        |
| `UPSTASH_REDIS_REST_TOKEN`     | Token Redis REST                                            |

Compartilhe a planilha com o e-mail da conta de serviço como editor. Entre em Integrações → Entrar como apresentador. O conector Google Drive da conversa não fornece credenciais ao aplicativo publicado.

### Sincronização manual

O servidor lê a aba, normaliza os telefones e compara CRM, planilha e a última versão sincronizada. Duplicados ou divergências geram revisão; nenhuma gravação acontece nessa tentativa. Escolha manter CRM ou usar planilha e sincronize novamente. Duplicados de linhas e telefones inválidos precisam ser corrigidos na planilha. Contatos novos de ambos os lados são preservados.

Limitação: a API Sheets não oferece transação atômica com edições feitas diretamente na interface do Google. Evite editar a planilha durante a sincronização. A aplicação ainda precisa de teste real de leitura/gravação e de concorrência antes de uso operacional.

### Envios reais

Endpoints oficiais usados: `/sender/advanced`, `/sender/listfolders`, `/sender/listmessages`, `/sender/edit`. A fila nativa da uAzapi recebe intervalos em segundos e continua fora da aba. Não há timer de envio no navegador nem função Vercel dormindo entre destinatários.

O servidor filtra exclusivamente `+5542999883017` e `+5511981205438`, exclui demonstrativos e deduplica os números. A sessão do apresentador fica em cookie HttpOnly. O registro da campanha é reservado no Redis com `SET NX` antes da chamada à uAzapi. Repetir o mesmo ID não cria outra fila. Se houver timeout ou resposta incerta, o registro fica bloqueado para reenvio automático: reconcilie com a fila da instância.

Pausa, retomada e cancelamento afetam a fila correspondente. Nova tentativa exige revisão e consulta renovada de mensagens `Failed`; o servidor deriva os destinatários do histórico e usa um ID determinístico por conjunto de falhas. Mensagens já enviadas não são incluídas. A resposta de inclusão na fila é “aceita na fila”, não entregue/lida; estados de entrega/leitura só aparecem quando retornados pela API.

O primeiro teste real está limitado a texto. Imagem, vídeo e documento estão disponíveis para composição e prévia; envio real de mídia permanece desabilitado até validar limites da instância. A documentação oficial indica JPG preferencial, MP4 para vídeo e documentos, mas não fixa limite numérico de tamanho no esquema consultado. Não inventamos esse limite.

## Publicação no GitHub e Vercel

1. Criar ou escolher o repositório e enviar esta pasta. `.gitignore` exclui `.env*`, `node_modules`, `dist` e `.vercel`.
2. Importar o repositório em Add New Project na Vercel.
3. Preset Vite; build `npm run build`; output `dist`. A API é publicada automaticamente a partir de `api/crm.js`.
4. Configurar variáveis, publicar e testar primeiro sem envio real.
5. Fazer uma campanha de texto para um contato autorizado somente após revisar mensagem e público.

Nenhum repositório remoto ou projeto Vercel foi criado nesta etapa. Não existe link público validado ainda.

## Serviços e custos

- Vercel: verificar o plano aplicável à utilização comercial e as cobranças por uso em https://vercel.com/pricing.
- uAzapi: usa a instância existente. Disponibilidade da fila e custos precisam ser confirmados no plano ATM+.
- Upstash Redis: serviço adicional para registros duráveis e reserva de campanhas. Preços consultados em 17/09/2026: camada gratuita com limites (256 MB e 500 mil comandos/mês); modalidade por uso anunciada a US$ 0,20 por 100 mil comandos. Não presumir gratuidade na contratação: https://upstash.com/pricing/redis.
- Google: requer projeto com Sheets API e conta de serviço; conferir quotas e políticas da conta.

## Pendências para cumprir todo o briefing

- Receber e aplicar fotos originais. A logo enviada foi aplicada à barra lateral.
- Configurar e validar credenciais de Google, uAzapi e Redis.
- Testar envio real, fila, intervalos, pausa, cancelamento, falha e retry com a instância.
- Validar mídia e limites da instância antes de habilitar envio de arquivos.
- Publicar repositório e projeto Vercel e testar o link externo.
- Teste end-to-end de sincronização real; tratamento de edições concorrentes diretas na planilha ainda exige cuidado.

Não foram enviadas mensagens reais durante o desenvolvimento.

## Disparo local com a instância configurada

No servidor de desenvolvimento (`npm run dev -- --host 127.0.0.1`), o CRM usa SQLite em `.local-data/crm.sqlite` para armazenar campanhas e reservar IDs atomicamente. O arquivo fica fora do Git. Não é necessário configurar Redis para testar neste computador.

O acesso do apresentador é automático exclusivamente para conexões de loopback (`127.0.0.1`/`localhost`) reconhecidas pelo servidor de desenvolvimento. Esse modo não existe na função publicada na Vercel. Na Vercel continuam obrigatórios Redis persistente e senha do apresentador. Não use o Vite como servidor público.

A uAzapi foi validada em 17/09/2026: conectada e autenticada. Nenhum envio real foi feito nessa validação. Abra Campanhas, selecione Matheus Donha ou Gui Brito, mantenha somente texto, revise e clique em Confirmar envio real. O servidor encaminha a campanha à fila da instância, que continua independente da aba. O teste end-to-end de recebimento só estará validado após essa confirmação explícita.
