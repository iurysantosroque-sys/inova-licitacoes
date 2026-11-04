# Validação da Central de Documentos — 46.0.0

Data: 04/11/2026. Testes fictícios não constituem resultados oficiais.

## Evidências verificadas

- 32 testes Node: validade civil, CNPJ numérico/alfanumérico, hashes, evidências, conectores sem emissão simulada, minutas, controle de revisão, filtros empresariais, limpeza exclusiva de upload órfão e regressão do preenchimento pela precificação.
- Suite SQL em transação com ROLLBACK, primeiro com DDL e novamente após a migração: duas empresas, administrador/editor/visualizador/revisor, RLS, Storage, vínculo cruzado, revisão/hash nulos, renovação sem perda, conflito de versão, aprovação invalidada, pacote com revisão desatualizada, snapshots, auditoria, quota, deduplicação e fila. Nenhuma fixture permaneceu no banco.
- Navegador em demonstração local: cadastro confirmado; importação e renovação de PDF; sugestões separadas da confirmação; histórico v1/v2; minutas incompletas bloqueadas para aprovação; aprovação nominal da revisão exata; edição retorna a rascunho; geração de duas minutas em lote sem aprovação automática; vínculo/desvínculo por edital; exportações PDF/DOCX e ZIP.
- ZIP aberto e manifesto inspecionado: hash dos bytes de cada arquivo corresponde ao declarado; data relevante e documento ausente registrados corretamente.
- PDF exportado renderizado e inspecionado visualmente. DOCX reaberto com python-docx, acentos e estrutura preservados. A renderização visual do DOCX não foi executada porque o runtime não possui LibreOffice.
- Interface conferida a 390 px, sem transbordamento do documento; abas permanecem horizontais, com rolagem própria. Cabeçalho móvel usa duas linhas para dar espaço à navegação.
- Build Vite e verificação de sintaxe dos módulos. Permanecem avisos de build sobre scripts clássicos existentes e tamanho do bundle.

## Ativação no Supabase

- Migrações aditivas `central_document_center` e `central_document_scheduler` aplicadas com autorização do usuário.
- Antes/depois: 37 editais e 7 versões documentais; 6 séries documentais reaproveitadas. Zero usuários fictícios de QA remanescentes.
- RLS ativo em todas as novas tabelas; PDFs continuam no bucket privado existente.
- Scanner executado no servidor e fila concluída. `cron.job_run_details` registrou `inova-central-queue` como `succeeded` em 04/11/2026 às 16:55 UTC. O enqueue diário está programado para 09:05 UTC; a execução diária futura não foi antecipada como já comprovada.
- Edge Function `document-center-analyze`, versão 1, JWT obrigatório; chamada sem autenticação retornou HTTP 401.
- Advisories revisados: tabela privada de quota sem policy é intencionalmente inacessível ao cliente; RPCs SECURITY DEFINER são intencionais, com escopo empresarial, autorização explícita e search_path vazio, cobertos pelos testes. Aviso pré-existente de proteção de senhas vazadas não foi alterado nesta tarefa.

## Limites da homologação

Não foi feita emissão/validação de certidão real, envio de e-mail/WhatsApp ou assinatura digital. Não houve teste de retorno real do provedor de IA para esta nova função. Não foram usados credenciais nem documentos reais para uploads de QA em produção. O fluxo autenticado completo em produção ainda depende de uma sessão de usuário; permissões e transações foram exercitadas pela suite SQL com papéis autenticados e dados revertidos.

Backup local do código anterior: `tmp/backup-central-documentos-20261104`. Isso não é um backup completo do banco/Storage nem um teste de restauração. Retenção, restauração e integrações externas devem seguir a configuração operacional documentada.
