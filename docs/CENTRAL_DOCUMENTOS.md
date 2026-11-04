# Central Inteligente de Certidões e Declarações — INOVA 46

Etapa 2 (46.1.0): painel por órgão, tentativas, candidatos oficiais e agendamento condicionado. Consulte `CENTRAL_DOCUMENTOS_ETAPA2.md` para configuração, ativação e limites reais dos conectores. As seções abaixo documentam a base da primeira etapa.

## Arquitetura e preservação

Implementação incremental em HTML/CSS/JavaScript, com sete subabas horizontais dentro de **Documentos**. Os módulos `document-center*.js` não substituem os fluxos de editais, cotações, precificação, dashboard ou INOVA Docs. O estado de autenticação e a empresa ativa vêm do cliente existente.

`companies`, `company_members`, `tenders`, `qualification_documents` e o bucket privado `qualification-files` são reaproveitados. `qualification_documents` continua sendo a fonte única de versões de certidões; registros legados aparecem na Central sem receber hash ou confirmação inventados. O backfill insere apenas cabeçalhos por série. A renovação legada foi corrigida para não apagar o histórico anterior.

Dados empresariais fixos das telas anteriores **não** são considerados confirmados. O cadastro da Central começa vazio e exige confirmação da razão social, CNPJ (numérico ou alfanumérico), endereço e poderes do representante. Exemplos fictícios só existem nos testes/demonstração.

### Correspondência das entidades solicitadas

| Entidade | Estrutura usada |
|---|---|
| empresas | `companies` + `central_company_profiles` confirmado |
| representantes_legais | `central_legal_representatives` |
| usuarios_permissoes | `company_members` + `central_permissions` |
| tipos_documentos | `central_document_types` |
| documentos | `central_documents` (série) |
| versoes_documentos | `qualification_documents` (append-only pela Central) |
| validacoes_documentos | `central_validations` |
| fontes_oficiais | `central_official_sources` |
| integracoes_orgaos | `central_integrations` |
| tentativas_emissao | `central_issuance_attempts` |
| modelos_declaracoes | `central_declaration_templates` — versões imutáveis |
| declaracoes_geradas | `central_generated_declarations`, `central_declaration_versions`, `central_reviews` |
| solicitacoes_assinatura | `central_signature_requests` — configuração pendente |
| exigencias_edital | `central_tender_requirements` |
| documentos_por_edital | `central_tender_documents`, versão exata |
| pacotes_habilitacao | `central_packages`, manifesto |
| regras_automacao | `central_automation_rules` |
| execucoes_automacao | `central_automation_runs`, fila persistente |
| notificacoes | `central_notifications` |
| logs_auditoria | `central_audit_log` |

## Instalação em banco existente

1. Faça backup do banco **e dos objetos do Storage**, incluindo um teste de restauração. O backup do banco não deve ser presumido como backup dos bytes dos PDFs.
2. Revise `supabase/migrations/20261104155400_central_document_center.sql`. Execute primeiro em ambiente de teste ou dentro de uma transação com `tests/document-center-rls.sql` e **ROLLBACK** ao terminar. Não use os dados fictícios como documentos reais.
3. Verifique concessões, RLS, FKs entre empresas e advisories antes de aplicar a migração em produção. Não há `DROP TABLE`, remoção de PDFs ou atualização em massa de dados de negócio.
4. Publique o frontend junto de todos os módulos novos e do service worker atualizado. Falha de configuração no modo online mostra erro explícito; não cria um banco privado por computador.
5. Implante `document-center-analyze` apenas se a análise por IA tiver sido autorizada. O JWT continua obrigatório. As variáveis `GEMINI_API_KEY` e `INOVA_CENTRAL_MODEL` ficam exclusivamente nos segredos da Edge Function. `INOVA_DOCS_MODEL` / `GEMINI_MODEL` são alternativas já usadas pelo projeto. Nenhum nome de modelo é presumido quando a configuração estiver ausente.
6. O agendador é ativado pela migração versionada `supabase/migrations/20261104164951_central_document_scheduler.sql`. O arquivo `supabase/central-document-center-schedule.sql` é uma referência operacional equivalente. Requer a extensão `pg_cron` suportada pelo projeto. A criação de jobs não prova execução: confira `cron.job_run_details` e a aba Histórico depois de executar.

Não exponha `service_role`, API keys de provedor, certificados, tokens de assinatura ou senhas no frontend ou em campos de configuração pública.

## Operação

### Certidões

1. Abra Documentos → Certidões e importe um PDF de até 25 MB.
2. A leitura de texto pode sugerir datas/CNPJ. Confira o titular, emissão, validade, código e tipo no PDF. Imagens digitalizadas não recebem OCR automático nesta entrega.
3. Confirme os metadados e salve. O hash SHA-256 é calculado sobre os bytes do arquivo e não é prova de autenticidade do órgão.
4. Renovar cria uma nova versão. Conflito de versão bloqueia sobrescrita; atualize a lista. Falha de upload/registro não altera a versão anterior. Só o upload novo órfão pode ser limpo após falha; os PDFs vinculados são retidos.
5. Confira versões anteriores em Histórico. A lista principal usa somente a versão mais recente de cada série.
6. “Registrar conferência” registra a declaração humana de que uma consulta foi feita na fonte oficial e sua evidência. Não é retorno de uma API oficial e não pode ser mostrado como validação automática.

Os estados são separados: validade temporal, conferência de metadados, autenticidade e tentativa de renovação. Documento válido em determinada data não equivale a documento autêntico ou habilitação juridicamente suficiente. Positiva, negativa e positiva com efeitos de negativa precisam de análise documental própria.

### Declarações

Há nove minutas básicas: requisitos de habilitação, ME/EPP, art. 7º XXXIII, fato impeditivo, reserva de cargos, custos trabalhistas, elaboração independente, concordância com o edital e declaração adicional. O texto é uma **minuta de conferência**, com campos pendentes; não se presume qualquer fato da empresa.

Preencha dados confirmados, selecione edital/representante e revise o texto. Salvar cria revisão com hash e snapshot. Aprovar exige perfil de revisor/administrador, responsável nominal, confirmação expressa e a revisão/hash exatos. Alteração posterior invalida a aprovação. Baixar PDF/DOCX não assina, envia ou protocola. Exportações não aprovadas recebem aviso de minuta.

A geração em lote cria somente rascunhos. Cada declaração precisa de revisão individual. Modelos personalizados são adicionados como versões imutáveis; a UI de cadastro inicial cria versão 1. Revisão/arquivamento avançados de modelos permanecem evoluções posteriores.

### Por edital

Cadastre exigências com página, cláusula, trecho e data relevante. A IA, quando configurada e autorizada por solicitação, recebe texto extraído do PDF e retorna **sugestões pendentes**. Referências que não existam literalmente na página são rejeitadas. A origem inclui SHA do PDF fornecido; o arquivo de análise não é automaticamente adicionado ao acervo de editais. Para conservação da fonte, arquive-o também na área de Editais existente.

Selecione uma versão documental exata para cada exigência. O campo “Não vinculada” remove somente o vínculo, nunca o documento. Confira validade na data relevante e revisão da exigência. Pacotes ZIP incluem PDFs selecionados e manifesto com IDs, versões, nomes únicos, hashes calculados e pendências; não representam certificação automática de conformidade.

Os arquivos antigos das pastas locais de Habilitação Jurídica / Declarações / Proposta não são importados ou apagados silenciosamente. A biblioteca compartilhada só utiliza arquivos acessíveis pelo Storage privado.

### Alertas e fila

O scanner considera a versão atual por série, usando data civil de America/Fortaleza. Notificações internas são deduplicadas por empresa, versão, marco e canal. Alertas fixos de 30/15/5/1 dia são complementados por avisos de planejamento de renovação configurados por tipo/órgão. Uma regra desativada não gera seu aviso adicional; não suprime os alertas fixos de segurança. Regra de antecedência **não** autoriza emissão automática.

O enqueue diário é idempotente por empresa/data. A fila usa `FOR UPDATE SKIP LOCKED`, lote de 10, lease, limite de oito tentativas, backoff exponencial e recuperação de execuções abandonadas. A reexecução manual gera nova execução autorizada, sem duplicar notificações já existentes.

**E-mail, WhatsApp, assinatura e emissão automática não estão ativos nesta entrega.** A fila possui o tipo `email` e estado explícito `configuration_required`, mas não há provedor contratado/configurado/testado nem envio externo implícito. Não apresentar um item em fila como mensagem enviada. A ativação exige integração e autorização específicas, separadas da publicação da Central.

## Permissões, privacidade e retenção

Administradores empresariais mantêm acesso total. Demais usuários começam como visualizadores; administradores podem conceder `editor` ou `reviewer`. RLS filtra por empresa e FKs compostas impedem vínculos cruzados. Campos de autoria, confirmação e aprovação são registrados no servidor. Audit log e snapshots não são editáveis pelo cliente.

Downloads usam a API autenticada do Storage e URLs `blob:` temporárias; não há URL pública permanente de certidão. HTTPS é obrigatório na publicação. A criptografia em repouso e backups dependem das configurações/garantias do projeto hospedado; esta alteração não inventa uma camada de criptografia nem substitui controles operacionais.

Não há expurgo automático. A política de retenção precisa de aprovação do controlador de dados, considerando bases legais, obrigações contratuais e direitos dos titulares. Não incluir certificados digitais ou credenciais no banco de cadastro. A demonstração salva somente metadados fictícios locais; o PDF importado em teste fica na memória da aba e não sobrevive a recarga.

## Verificação

- `node --test tests/document-center-core.test.js tests/document-center-service.test.js tests/inova-docs-core.test.js tests/inova-docs-autofill.test.js`
- `node --check document-center.js` e demais módulos.
- `node node_modules/vite/bin/vite.js build`.
- SQL: `tests/document-center-rls.sql` em transação revertida, após a migração de teste.
- Navegador: upload/renovação, metadados, conferência, seleção/filtros, exportação, revisão/hash, pacote, abas por teclado e 390×844. A validação final é registrada pelo responsável pelo QA.

As integrações autorizadas só devem ser anunciadas após teste com resposta real documentada do serviço. Ver `docs/INTEGRACOES_DOCUMENTAIS.md`.
