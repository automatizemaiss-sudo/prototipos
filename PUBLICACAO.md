# Publicar CRM FUTPB sem substituir a Flying

## Estado entregue

- Branch local: `codex/futpb-multibrand`.
- Commit local inicial: `297a4ee` (configurações, isolamento, logo e testes).
- Ajuste final de enquadramento da logo e este guia: pendentes de commit pelo usuário.
- A branch remota foi criada a partir de `main`, mas o código novo não foi enviado.
  O Git local e o conector retornaram 403. Faça o push pelo GitHub Desktop.
- Nenhuma alteração foi integrada à `main` e nenhum novo deploy foi feito.
- Na Vercel, `APP_BRAND=flying` foi salvo no projeto `prototipos` em todos os
  ambientes. Não houve redeploy nem alteração de credenciais.

## Validar localmente

```sh
npm test
APP_BRAND=flying npm run build
APP_BRAND=futpb npm run build
APP_BRAND=futpb npm run dev -- --host 127.0.0.1
```

Foram validados os 11 testes, os builds das duas marcas, as seis telas em ambas
as marcas e uma simulação local FUTPB. Nenhuma mensagem real foi enviada.

## Vercel

1. Faça commit dos ajustes finais e push de `codex/futpb-multibrand`.
2. Na equipe `Automatize Mais`, crie um **novo projeto**, por exemplo `crm-futpb`,
   conectado ao repositório `automatizemaiss-sudo/prototipos`.
3. Selecione a branch `codex/futpb-multibrand` para a primeira publicação.
   Confira que o commit contém `config/brands.js` e `public/futpb-logo.png`.
4. Framework Vite, build `npm run build`, diretório de saída `dist`, raiz `.`.
5. Configure em todos os ambientes: `APP_BRAND=futpb` e
   `FUTPB_ENABLE_REAL_SENDS=false`. Não importe o `.env.local` da Flying.
6. Antes de publicar, confirme que o destino é **crm-futpb**, nunca `prototipos`.
7. Confira título CRM FUTPB, logo, 24 contatos fictícios e integrações desligadas.
   `/api/crm?action=status` deve retornar `brand: "futpb"`, `google: false`,
   `whatsapp: false` e `storage: false` enquanto as integrações estiverem vazias.
8. A Flying deve permanecer em https://prototipos-zeta.vercel.app/ com sua
   identidade original. Foi conferida durante a entrega.

Depois de revisar e integrar a branch à `main`, os dois projetos podem publicar
`main` com suas respectivas variáveis de marca. Faça novo deploy ao mudar
`APP_BRAND`, pois ela é utilizada no build e no servidor.

## Integrações pendentes

A base FUTPB é demonstrativa e independente, salva no navegador. Google Sheets,
Redis compartilhado e ATM+ ainda dependem de recursos e credenciais próprios.
Configure somente as variáveis `FUTPB_*` documentadas em `.env.example`.
Não reutilize a planilha ativa nem a instância ATM+ da Flying. Disparos exigem
ativação explícita e continuam limitados aos dois números autorizados no servidor.
