# Acesso INOVA Sistemas em Licitações

A integração usa uma sessão nativa de Licitações vinculada à identidade central e preserva UUID, empresa e cargo de cada conta. O cliente recebe tokens em memória após troca de código único com PKCE. Uma concessão curta no banco é exigida para contas vinculadas. O modo de transição mantém acesso legado para contas ainda não vinculadas. A chave do frontend fica desabilitada por padrão.

Homologue com dois projetos Supabase de teste e dados fictícios. Revise o [guia de homologação e reversão](https://github.com/iurysantosroque-sys/inova-documentos/pull/1). Rode `node --test tests/inova-sso.test.mjs`. A fixture SQL em `tests/inova-sso-sql.mjs` exige o módulo `embedded-postgres`, caminho para a migração central e uma pasta descartável, nessa ordem. Ela inicializa uma instância exclusivamente local, porta 55487 por padrão (ajustável por `INOVA_SQL_TEST_PORT`).

Nenhum perfil é vinculado por coincidência de e-mail. Preserve a origem do frontend ou trate a portabilidade de dados locais do navegador antes do corte. A revogação de uma conexão Realtime aberta é um item separado da validação da concessão PostgREST/Storage.

## Vínculo inicial de contas existentes

O pareamento automático é opcional durante a transição e começa desligado em `inova_sso.settings.pairing_enabled`. Com a opção aprovada em homologação, o usuário entra no portal e confirma uma vez as credenciais da conta antiga na origem de Licitações. A senha antiga vai diretamente ao Supabase Auth de Licitações. O broker recebe somente o token da sessão nativa, confirma-o com Auth e exige uma sessão recente, uma conta confirmada e uma membresia existente. O banco vincula os dois UUIDs uma única vez. O código tem PKCE, prazo curto e é consumido na troca. Colisões e remapeamentos exigem revisão administrativa. Nenhum e-mail ou nome é usado para inferir o vínculo.

O pareamento mantém UUIDs, cargos e dados das empresas. Quando houver só uma das contas, a administração precisa provisionar a identidade e conceder a membresia ausente explicitamente. O broker emite sessões AAL1. Contas com MFA verificado no destino ficam fora do corte até homologar um fluxo que preserve o fator. Verifique a cobertura antes de fechar o login legado ou marcar `require_sso=true`. Desligue o pareamento após a transição. O usuário já vinculado precisa apenas da credencial do portal.

Verifique também `node --test tests/inova-sso-browser.test.mjs` para o fluxo do cliente com navegador e broker simulados.


## Cadastro coordenado e reversão

A migração adiciona `inova_sso.company_routes`. Cadastre somente pares de empresas conferidos por um operador autorizado. O broker só aceita o pedido de um administrador central com sessão vigente e cria a conta de destino como `member`. A criação é idempotente, preserva contas legadas e não usa e-mail ou nome para localizar uma conta existente. O painel central é o ponto de cadastro e de retomada de uma pendência.

Em caso de rollback, mantenha contas, UUIDs e membros. Desabilite o pareamento, revogue as concessões e retire somente os vínculos do piloto após revisar o inventário. Se houver contas novas criadas exclusivamente pelo SSO, prepare um caminho administrativo de acesso antes de reabrir o modo legado.
