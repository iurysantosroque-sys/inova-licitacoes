# INOVA Licitações

Aplicação web/PWA para acompanhar editais, itens, fornecedores, cotações e preços de disputa em uma empresa compartilhada.

## Funcionalidades

- autenticação individual e empresa compartilhada por código de convite;
- importação e sincronização de editais/itens pelo PNCP;
- cadastro manual de licitações, itens, fornecedores e cotações;
- leitura local de cotações em Excel, CSV e PDF com texto;
- associação conservadora por texto e associação inteligente por Edge Function, sempre com revisão humana;
- cálculo de custo equivalente, frete, impostos, reserva, margem e lucro mínimo;
- metas por item salvas no navegador e configurações globais salvas no Supabase;
- arquivamento privado de cotações no Storage (PDF/Excel/CSV, até 25 MB);
- modo demonstração local e instalação como PWA.

## Desenvolvimento local

Requer Node.js e pnpm:

```bash
pnpm install
pnpm dev
```

Abra o endereço mostrado pelo Vite. Em desenvolvimento o service worker não é registrado, evitando cache de arquivos em edição.

Para gerar a versão de produção:

```bash
pnpm build
```

## Configuração do frontend

Copie a configuração pública para `app-config.js` e `public/app-config.js`:

```js
window.INOVA_CONFIG = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_..."
};
```

A Publishable Key é pública por definição e só é segura quando tabelas, funções e Storage estão protegidos por RLS e grants. Nunca coloque `service_role`, senhas ou chaves de provedor de IA no frontend.

## Supabase

- `supabase/schema.sql`: bootstrap completo para um projeto novo, usando as tabelas atuais em inglês.
- `supabase/migrations/`: alterações incrementais revisáveis. A migração de hardening incluída no repositório **não é aplicada automaticamente**.
- `supabase/functions/pncp-import`: proxy PNCP autenticado, com orçamento total de tempo e limites de paginação.
- `supabase/functions/ai-match-quote`: associação Gemini que valida o usuário, a empresa, a licitação e busca os itens oficiais pelo JWT/RLS.

Secrets necessários para `ai-match-quote`:

```text
GEMINI_API_KEY
GEMINI_MODEL          # opcional
```

As variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` são fornecidas pelo ambiente das Edge Functions.

Depois de aplicar qualquer mudança de banco, execute os Security e Performance Advisors do Supabase e teste com dois usuários de empresas diferentes.

## Fluxo recomendado da cotação

1. Cadastre ou importe a licitação e seus itens.
2. Cadastre o fornecedor.
3. Na aba **Cotações**, selecione licitação, fornecedor e arquivo.
4. Leia o arquivo; use a IA online se desejar.
5. Revise descrições, embalagem, equivalência, preço e correspondências abaixo de 85%.
6. Salve. Reimportar a mesma combinação substitui os itens correspondentes sem acumular duplicatas.
7. Na aba **Precificação**, selecione um item e arraste a bolinha de preço para acompanhar lucro, margens, preço de parada e recomendação em tempo real. A simulação não altera os dados salvos; metas, filtros e exportação CSV continuam disponíveis.

## Publicação

O projeto usa caminhos relativos e funciona no GitHub Pages sob `/inova-licitacoes/`. A publicação deve servir `index.html`, `app.js`, `styles.css`, `app-config.js`, manifest, service worker e assets no mesmo diretório-base.

URL atual: <https://iurysantosroque-sys.github.io/inova-licitacoes/>

