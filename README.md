# INOVA Licitações — Versão 1 compartilhada

Aplicativo web instalável (PWA) para trabalhar em família com a mesma base de licitações.

## O que esta V1 já contém
- Login individual por e-mail e senha
- Uma empresa compartilhada entre vários usuários
- Código de convite para seu pai/irmão entrarem na mesma base
- Dashboard de licitações, itens e oportunidades
- Cadastro de licitações e itens
- Cadastro de fornecedores
- Cotações manuais
- Equivalência de embalagem (ex.: galão 5 L x unidade em litro)
- Escolha automática do menor custo equivalente
- Imposto, margem desejada, margem mínima e lucro mínimo em reais
- Preço-alvo e preço-limite por item
- Upload privado de PDF, Excel e CSV
- Estrutura de IA no servidor para extrair cotações e associar aos itens do edital
- Instalação como PWA no notebook/celular
- Modo demonstração quando ainda não há Supabase configurado

## 1) Testar agora sem conta
Execute na pasta:

```bash
python -m http.server 8080
```

Abra `http://localhost:8080` e clique em **Abrir modo demonstração**.

## 2) Ativar o banco compartilhado
1. Crie um projeto no Supabase.
2. No Supabase, abra **SQL Editor**.
3. Cole e execute todo o arquivo `supabase/schema.sql`.
4. No painel do Supabase, copie:
   - Project URL
   - Publishable Key
5. Abra `app-config.js` e preencha:

```js
window.INOVA_CONFIG = {
  SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_..."
};
```

A Publishable Key pode ficar no frontend quando o banco está protegido por RLS. **Nunca** coloque Service Role Key ou chave da OpenAI no `app-config.js`.

## 3) Primeiro acesso da família
1. Você cria sua conta.
2. No primeiro acesso, clique **Criar empresa**.
3. Abra a aba **Equipe** e copie o código.
4. Seu pai e seu irmão criam contas separadas.
5. Eles escolhem **Entrar em uma empresa** e digitam o código.
6. Todos passam a ver os mesmos pregões, fornecedores e cotações.

> Se a confirmação de e-mail estiver ativada no Supabase, cada pessoa precisa confirmar o e-mail antes do primeiro login.

## 4) Colocar online e instalar como app
Esta pasta é um site estático. Pode ser publicada no Netlify, Cloudflare Pages, Vercel ou hospedagem HTTPS equivalente.

Depois de publicada em HTTPS:
- Windows/Chrome/Edge: abrir o sistema e usar **Instalar App**.
- Android/Chrome: abrir o sistema e usar **Instalar aplicativo/Adicionar à tela inicial**.
- iPhone/iPad: abrir no Safari, Compartilhar e **Adicionar à Tela de Início**.

## 5) Ativar a IA que lê cotações
A função está em `supabase/functions/processar-cotacao/index.ts`.

Ela foi desenhada para:
1. receber o ID de um PDF/Excel já enviado ao Storage;
2. baixar o arquivo de forma privada;
3. enviar o arquivo para a OpenAI;
4. extrair descrição, marca, apresentação e preço;
5. comparar com os itens da licitação;
6. calcular `fator_equivalencia`;
7. gravar automaticamente as associações com confiança >= 55%;
8. guardar o JSON completo da análise no documento.

Para ativá-la, configure no Supabase Edge Functions os secrets:
- `OPENAI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

A chave da OpenAI fica somente no servidor.

### Observação importante sobre a IA
A associação automática deve ser revisada quando a confiança for baixa ou quando embalagem/especificação técnica puder alterar a conformidade com o edital. A IA auxilia a cotação; ela não substitui a conferência da especificação do item.

## Estrutura
- `index.html` — interface
- `styles.css` — layout responsivo
- `app.js` — login, dados, cálculos e upload
- `app-config.js` — somente URL + Publishable Key do Supabase
- `manifest.json` / `service-worker.js` — instalação PWA
- `supabase/schema.sql` — banco, RLS, storage e funções de empresa
- `supabase/functions/processar-cotacao/index.ts` — processamento por IA

## Próxima evolução já prevista no banco
- Busca automática no PNCP pelo número/órgão
- Importação automática de itens e documentos do edital
- Leitura do edital com alertas de amostra, habilitação e prazo
- Sala de disputa com simulação de lance
- Empenhos, entregas, NF, pagamentos e atestados
