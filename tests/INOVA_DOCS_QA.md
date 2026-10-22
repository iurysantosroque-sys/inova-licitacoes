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
