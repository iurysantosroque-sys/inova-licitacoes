# Validação INOVA Docs — 22/10/2026

Executado antes da publicação 45.1.0:

- Seis testes de lógica passaram, com campos ausentes, ausência de prova técnica, preservação dos fatos, validação de envio, concorrência e escape de HTML.
- Sintaxe de app, UI, core, export e Edge Function validada; build Vite concluído.
- Teste SQL com duas empresas, usuários fictícios e rollback: isolamento, relacionamento entre empresas, versões/eventos atômicos, revisão otimista, envio incompleto bloqueado, cooldown de IA, auditoria imutável e visualizador sem escrita.
- Navegador desktop: geração manual, edição, tabela, gravação/reabertura após recarga, versões, modelo personalizado salvo e utilizado, envio sem canal/destinatário/data bloqueado e status em revisão salvo.
- PDF baixado e renderizado: uma página, acentos, preços, quantidades e tabela legíveis sem sobreposição.
- DOCX baixado e reaberto com python-docx: uma tabela real com duas linhas, texto e valores preservados. Renderização Word não executada: LibreOffice não está disponível no runtime; não se afirma fidelidade visual no Word.
- Upload de PDF fictício: extração de texto e página exibida para revisão.
- Celular 390 × 844: sem overflow horizontal da página; navegação interna adaptativa.
- Edge Function ativa com JWT obrigatório: solicitação sem autenticação retorna 401.

Limites da verificação: geração autenticada pelo provedor de IA e upload/download remoto de Storage não foram testados com uma sessão real do usuário. A demonstração não executa IA e guarda somente dados fictícios locais. OCR e base normativa oficial sincronizada permanecem pendentes e são informados na interface/documentação. Nenhum e-mail, protocolo ou mensagem externa foi enviado.

Correções encontradas no QA: carregamento antigo dos módulos, posição de inicialização da aba, seleção do editor ao inserir tabela, biblioteca Word com caminho/MIME incorretos, clique em submit antes da submissão e identificação de form sombreada pelo campo `name=id`.

## Atualização 45.1.1 — modelos e paleta

- Dez testes de lógica aprovados: catálogo de 24 modelos únicos, distribuição nas cinco categorias, tipo válido, placeholders/cautelas, cópias/fallback e whitelist das sete colunas editáveis.
- Navegador desktop: 24 cartões iniciais; busca sem acento (`cotacao`), filtros combinados, estado vazio, duplicação e persistência de personalizado após recarregar.
- Cadastro de modelo: trocar categoria e filtrar a biblioteca preserva nome e corpo ainda não salvos. Modelo fictício salvo na categoria correta.
- Seleção por cartão e pelo seletor do gerador: tipo/categoria corretos; contexto, texto revisado e título personalizado preservados. Título automático de rascunho novo acompanha o modelo escolhido.
- Documento fictício gerado e salvo. Folha branca, títulos e células escuros confirmados por estilos calculados; tabela inserida pelo editor.
- Paleta usa variáveis existentes: painel rgb(12,22,29), cartões rgb(10,18,24), botões rgb(230,170,52). CSS restrito ao módulo.
- Mobile 390 × 844: biblioteca e filtros utilizáveis; scrollWidth igual à largura da página (375 px com scrollbar).
- Sintaxe e build aprovados. Revisão estática independente sem bloqueadores.
- Consulta somente de metadados confirmou as colunas existentes no Supabase. Nenhuma migração, política, sessão, função ou dado empresarial foi alterado; hash do exportador e SQL original preservado.

Limite conhecido: personalizados ou cópias renomeados sem correspondência usam o primeiro tipo da categoria, editável no gerador; não há nova coluna no banco. O escopo desta atualização não inclui nova validação autenticada do provedor de IA nem renderização Word.
