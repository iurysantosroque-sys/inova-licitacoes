# INOVA Licitações — coordenação de agentes

## Agentes especializados

- `produto_licitacoes`: requisitos, prioridades, fluxos de negócio e critérios de aceite.
- `supabase_guard`: Auth, RLS, banco, Storage, Edge Functions e segurança de dados.
- `frontend_worker`: implementação de interface e JavaScript após escopo e causa estarem claros.
- `qa_release`: reprodução de bugs, testes de navegador e verificação de publicação.

## Fluxo de trabalho

- Para tarefas que envolvam duas ou mais áreas, delegue primeiro as análises independentes aos agentes especializados adequados.
- Produto, segurança e QA podem analisar em paralelo quando seus escopos forem independentes.
- Aguarde as análises e consolide requisitos, riscos e critérios de aceite antes de iniciar alterações.
- Use somente um agente de escrita por vez. O `frontend_worker` é o escritor padrão para o código da aplicação.
- O agente principal integra as conclusões, resolve divergências e apresenta o resultado final ao usuário.
- Não use subagentes em tarefas triviais de uma etapa quando a delegação não trouxer ganho real.

## Limites de mudança

- Não publique, não altere configurações externas e não aplique mudanças no Supabase sem autorização explícita do usuário para aquela tarefa.
- Nunca exponha chaves secretas, `service_role`, senhas ou tokens em arquivos públicos, logs ou respostas.
- Preserve mudanças existentes do usuário e evite alterações fora do escopo.
- Toda implementação deve terminar com validação proporcional ao risco; mudanças de interface devem incluir teste no navegador.

## Contexto técnico

- Aplicação frontend em HTML, CSS e JavaScript.
- Cliente `@supabase/supabase-js` para Auth, banco, Storage e Edge Functions.
- Publicação atual no GitHub Pages sob `/inova-licitacoes/`.
- Idioma padrão da interface e das comunicações: português do Brasil.
