# Publicação única — Flying Imports e FUTPB

A mudança de plano usa **um único projeto Vercel**, com todas as credenciais e
integrações compartilhadas. Não crie um segundo projeto para FUTPB.

## Commit e publicação pelo usuário

1. Faça commit das alterações na branch `codex/futpb-multibrand` e envie ao GitHub.
2. Revise e integre a branch à `main` quando desejar publicar.
3. Use o projeto existente `automatize-mais/prototipos`, conectado ao repositório
   `automatizemaiss-sudo/prototipos`. O endereço continua sendo
   https://prototipos-zeta.vercel.app/.
4. Preserve as variáveis existentes de Google Sheets, ATM+ e Redis.
   Variáveis `FUTPB_*` não são mais usadas. Não há senha administrativa a configurar.
5. `APP_BRAND=flying` define a apresentação inicial; `futpb` também é válido.
   A troca em Administração funciona sem novo build ou deploy.
6. Build: `npm run build`; saída: `dist`; framework: Vite; raiz: `.`.

## Uso

Abra **Administração** e selecione **CRM Flying Imports** ou **CRM FUTPB**.
A identidade muda imediatamente e fica salva neste navegador. Os dados permanecem
os mesmos. Outros visitantes escolhem sua própria visualização.

As credenciais continuam apenas no servidor. Contatos, campanhas, histórico e
sincronização usam os caminhos existentes da Flying. Os dois números autorizados
continuam sendo os únicos destinatários possíveis de disparos reais.

## Validação

```sh
npm test
APP_BRAND=flying npm run build
APP_BRAND=futpb npm run build
npm run dev -- --host 127.0.0.1
```

Confira a troca nos dois sentidos, persistência após recarregar, logo, favicon,
título e uma campanha em simulação. Trocar marca não deve criar mensagens reais
nem apagar contatos ou históricos. Rascunhos existentes mantêm seu texto;
novas campanhas usam a saudação da marca atualmente escolhida.

As alterações desta etapa ficam na pasta para commit e publicação pelo usuário.
Nenhum deploy foi realizado nesta etapa.
