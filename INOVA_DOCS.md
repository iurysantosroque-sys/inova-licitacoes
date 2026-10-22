# INOVA Docs

Nova aba em **Documentação → INOVA Docs**, integrada à sessão e à empresa do aplicativo existente. Não substitui a aba Propostas nem altera cotação, fornecedor, catálogo ou valores de precificação.

## Fluxo disponível

1. Abra Novo documento, selecione um edital já cadastrado ou preencha o contexto manualmente.
2. Escolha uma das cinco categorias e o tipo; informe fatos, pedido, destinatário, empenho, contrato, produto, quantidade e preço.
3. Adicione evidências (até 12 arquivos, 10 MB cada). Confira/corrija a extração antes de gerar.
4. Prepare um documento com os dados e modelo, ou execute a análise por IA. A preparação manual não simula análise por IA.
5. Revise o texto no editor, a versão de e-mail, as pendências e a comparação técnica. Salve uma versão e exporte PDF/DOCX ou copie o texto.
6. Registre situação, canal, destinatário, data do envio, protocolo, resposta e próximo prazo. Baixar/copiar nunca marca envio.
7. Consulte versões e restaure uma anterior como nova revisão. Atualizar lista compartilhada e reabrir documento consultam o banco novamente.

Meus documentos tem busca por título, tipo, contexto e conteúdo, filtros de situação/período e indicadores reais dos documentos carregados. São exibidos até os 500 documentos mais recentes por empresa; organizações com volume superior exigem paginação de consulta adicional. Modelos permitem criação, favoritos, duplicação e arquivamento. Variáveis ausentes ficam `[PREENCHER]`.

Na versão 45.1.1, a biblioteca inclui 24 modelos prontos: cinco de disputa, cinco de julgamento/habilitação, sete de contratação/fornecimento, cinco empresariais e dois de mensagens. Busca sem acentos e filtro por categoria podem ser combinados. Escolher um modelo sincroniza categoria e tipo, preserva o contexto e não substitui o texto antes da confirmação ao gerar. Os modelos personalizados existentes são mantidos; cópias reconhecem o tipo pelo nome, com fallback para o primeiro tipo da categoria em modelos legados sem correspondência. Nenhuma migração de banco é necessária.

A interface acompanha a paleta escura/dourada do INOVA. Somente a folha do documento fica branca, com texto, títulos e tabelas escuros.

## Instalação e publicação

Frontend: HTML/CSS/ES modules compatíveis com GitHub Pages e Vite. Inclua `inova-docs.js`, `inova-docs-core.js`, `inova-docs-export.js` e `inova-docs.css` junto com `app.js` e `index.html`. Não há segredo no navegador.

O SQL aditivo está em `supabase/inova-docs.sql`. Antes de aplicar, crie uma migration com a CLI instalada (`supabase migration new inova_docs`), copie o SQL para o arquivo gerado, revise e aplique no ambiente autorizado. Requer tabelas existentes `companies`, `company_members`, `tenders` e helpers privados `is_company_member`/`is_company_admin`. O relacionamento composto preserva os documentos quando um edital é excluído, desvinculando somente `tender_id`.

Publique a função `supabase/functions/docs-assistant/index.ts`, mantendo `verify_jwt=true` em `supabase/config.toml`. Configure `GEMINI_API_KEY` somente nos secrets do servidor. `INOVA_DOCS_MODEL` tem prioridade sobre `GEMINI_MODEL`. Sem override, a função consulta a lista oficial e escolhe um modelo Flash de texto estável disponível, com cache de dez minutos. Uma configuração ausente ou falha do provedor produz erro explícito; modelos e edição continuam operacionais.

O login, cadastro, sessão, convite e recuperação de acesso continuam sendo os fluxos existentes do aplicativo. Não se cria outra conta/empresa. Administradores globais permanecem administradores; membros são editores por padrão. O administrador pode limitar membros ao perfil visualizador na configuração específica do INOVA Docs.

## Contratos e autorização

- `inova_docs_save(p_id uuid, p_company_id uuid, p_expected_revision integer, p_document jsonb) → jsonb`: cria com revisão esperada zero; atualiza apenas se a revisão atual coincide. Retorna o documento salvo. RLS e permissão de edição aplicam-se ao usuário. Snapshot e evento são gravados na mesma transação por trigger privada. Versões e eventos não possuem grants de escrita para usuários.
- `inova_docs_can_write(p_company_id uuid) → boolean`: membro administrador ou editor do módulo.
- `inova_docs_reserve_ai(p_document_id uuid) → boolean`: wrapper invoker de função privada com autenticação e autorização explícitas; reserva atômica de 30 análises por usuário/empresa/dia e intervalo de 15 segundos. Não há grants de edição da tabela de uso.
- `POST docs-assistant { document_id }`: aceita apenas identificador; verifica JWT com `getUser`, usa cliente do usuário/RLS, consulta contexto/anexos autorizados no banco. Nunca recebe URL externa arbitrária ou chave do cliente. Retorna `analysis`, `documento`, `email`, `source_revision`, `prompt_version`.
- Bucket privado `docs-files`: caminho `company_id/document_id/attachment_id/nome-seguro`, download autenticado, limite/MIME no bucket, sem URLs públicas permanentes.

Os prompts são versionados e tratam anexos/fatos como dados não confiáveis. Recuperação contextual seleciona até 18 trechos com janela/overlap por correspondência de termos. As fontes da resposta precisam citar identificador, página e cópia literal de trecho recuperado. Conclusões de equivalência sem evidência verificável passam a “não confirmado”. O servidor rejeita respostas malformadas e citações jurídicas sem base normativa.

## Limites e pendências explícitas

- OCR de imagens e PDF digitalizado ainda não está configurado; aparece **OCR pendente**. É possível inserir manualmente o texto revisado.
- DOCX é extraído como estrutura textual; o número exibido é uma origem lógica, não uma página física de Word. XLSX usa uma origem por planilha. PDF mantém páginas físicas.
- A base normativa oficial sincronizada ainda não está implementada. A IA não pode citar artigos, súmulas ou acórdãos; peças com fundamentação ou risco jurídico requerem revisão profissional. A referência documental não garante autenticidade de um arquivo enviado por usuário.
- Não há envio externo de e-mail, protocolo, assinatura digital ou notificações fora do app. Alertas são internos, pelo prazo registrado.
- Não há cadastro separado de contratos/contatos/empenhos ou duplicação do cadastro de editais; esses dados são contexto versionado do documento.
- Exportações usam a mesma árvore revisada, com negrito/itálico, títulos, listas e tabelas reais. PDF pagina automaticamente e usa fonte Helvetica; caracteres fora da codificação suportada produzem erro explícito. DOCX mantém texto editável e paginação do editor Word. A geometria da tela não é uma composição WYSIWYG de páginas A4.
- Demo só usa empresa/edital fictícios e chave local separada `inova-docs-fictional-v1`; guarda texto e extração, não arquivo binário. IA desabilitada. Online não tem fallback local.
- Administradores definem retenção e acesso conforme as obrigações da empresa. O módulo usa compartilhamento empresarial; não substitui uma política jurídica de LGPD ou controle de acesso organizacional.

## Validação

`node --test tests/inova-docs-core.test.js`

`node --check inova-docs.js` (idem core/export/app)

`npm run build` (ou `node node_modules/vite/bin/vite.js build` quando npm não estiver no PATH)

QA de navegador deve cobrir criar modelo/documento, persistir/reabrir/restaurar, status/enviar sem dados, anexo válido/inválido, indisponibilidade de IA, PDF/DOCX, desktop/mobile e console. Testes de banco precisam comprovar duas empresas isoladas, visualizador sem escrita, optimistic lock, auditoria imutável, reserva concorrente e desvinculação ao excluir edital. Somente afirmar os testes executados no ambiente de entrega.
