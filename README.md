# INOVA Licitações

Aplicação web/PWA para acompanhar editais, itens, fornecedores, cotações e preços de disputa em uma empresa compartilhada.

## Funcionalidades

- tela de cotações por edital com resumo, busca, filtros e comparação direta do melhor custo;
- importação automática de PDF: upload privado, leitura multimodal por IA, associação aos itens oficiais e salvamento conservador;
- autenticação individual e empresa compartilhada por código de convite;
- importação e sincronização de editais/itens pelo PNCP;
- cadastro manual de licitações, itens e fornecedores;
- simulação local de cotações em CSV ou PDF com texto no modo demonstração;
- revisão humana separada para sugestões incertas; baixa confiança nunca é salva automaticamente;
- cálculo de custo equivalente, frete, impostos, reserva, margem e lucro mínimo;
- metas por item salvas no navegador e configurações globais salvas no Supabase;
- arquivamento privado de PDFs de cotação no Storage (até 25 MB), preservado para auditoria;
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
- `supabase/functions/ai-match-quote`: recebe somente `quote_id`, valida acesso pelo JWT/RLS, baixa o PDF privado e usa o Gemini multimodal para extrair e relacionar os itens.
- Em falha temporária da IA, **Reprocessar PDF armazenado** reutiliza o mesmo `quote_id` e arquivo privado, sem criar outro upload.

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
3. Na aba **Cotações**, selecione o edital, o fornecedor e o PDF; o processamento começa automaticamente.
4. A IA lê o documento, relaciona os itens oficiais e salva apenas vínculos com confiança de item ≥ 90%, confiança do fator ≥ 85% e sem incompatibilidades.
5. Revise as sugestões incertas e marque **Aprovar correção** somente após conferir vínculo, embalagem e preço.
6. Reprocessar a mesma combinação atualiza os itens correspondentes na cotação de origem IA e preserva os arquivos enviados para auditoria.
7. Na aba **Precificação**, selecione um item e arraste a bolinha de preço para acompanhar lucro, margens, preço de parada e recomendação em tempo real. A simulação não altera os dados salvos; metas, filtros e exportação CSV continuam disponíveis.

## Publicação

O projeto usa caminhos relativos e funciona no GitHub Pages sob `/inova-licitacoes/`. A publicação deve servir `index.html`, `app.js`, `styles.css`, `app-config.js`, manifest, service worker e assets no mesmo diretório-base.

URL atual: <https://iurysantosroque-sys.github.io/inova-licitacoes/>

