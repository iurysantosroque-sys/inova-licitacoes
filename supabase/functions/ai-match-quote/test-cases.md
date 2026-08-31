# Casos de validação do motor de correspondência

Use estes casos com `fetch` mockado (sem chamar APIs reais). Em todos os casos ambíguos ou conflitantes, o resultado esperado é `needs_review=true` e `safe_to_save=false`.

1. Nome diferente, produto equivalente: óculos de proteção/Óculos Kamaleon Plastcor — revisar requisitos críticos antes de aprovar.
2. Nome parecido, produto diferente: tubo 10 mm/tubo 8 mm — incompatível.
3. Tensão diferente: 220 V/127 V — incompatível.
4. Unidade equivalente: 1 L/1000 ml — não marcar conflito de medida.
5. Massa equivalente: 1 kg/1000 g — não marcar conflito de medida.
6. Embalagem diferente: pacote 100/pacote 50 — revisão obrigatória.
7. Marca e modelo identificados sem ficha — pesquisar ou revisar.
8. Descrição abreviada — revisar se não houver evidência suficiente.
9. CA exigido sem confirmação — revisão obrigatória.
10. NBR exigida sem confirmação — revisão obrigatória.
11. Composição inox/aço carbono — incompatível.
12. Fonte oficial confirma modelo e material — pode elevar confiança, sem superar requisitos ausentes.
13. Fontes externas conflitantes — manter incompatibilidade e revisão.
14. Gemini HTTP 429 — usar fallback local, sem API paga.
15. Tavily indisponível — seguir sem imagens e preservar o lote.
16. Nenhuma API externa disponível — manter linhas extraídas em revisão.
17. Nenhum item correspondente — `matched=false`.
18. Dois candidatos igualmente plausíveis — não escolher automaticamente.
19. Imagem semelhante sem confirmação técnica — não aprovar automaticamente.
20. PDF com mais de 100 itens — processar todas as linhas sem truncamento silencioso.
