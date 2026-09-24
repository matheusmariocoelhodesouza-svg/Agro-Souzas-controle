# Correções da auditoria operacional — 23/09/2026

Base inicial: main c9573c0; integrada com main 58c77cf após atualização concorrente. Build de recursos: 2026.09.23-audit2. Cache PWA: hotfix61.

## Entregue

- CSV, AFD e AEJ voltam a ter a função de download. CSV escapa aspas e neutraliza fórmulas em campos de texto.
- Ponto carrega funcionários ao abrir; preserva seleção e permite consultar arquivados sem oferecê-los para nova biometria.
- Consumo fora de faixa, hodômetros regressivos e deslocamentos impossíveis ficam sinalizados e não contaminam o KPI de distância. A média entre abastecimentos é explicitamente estimativa. O histórico continua limitado aos 200 registros carregados.
- Novo combustível pede leitura do painel em vez de copiar automaticamente o cadastro possivelmente incorreto. Valores inválidos são rejeitados e anomalias pedem conferência.
- Carretinhas não aparecem como opção de combustível nem recebem indicador de tanque. Engates oferecem carretinhas identificadas, com validação adicional na interface.
- Manutenção sem vencimento mostra “Sem programação”; KM ausente deixa de aparecer como zero.
- Financeiro descreve competência e saldo parcial; não confunde vínculo de celular com presença online.
- Visão financeira do banco exclui cancelados e mantém security_invoker. Migração aplicada; receita e contagem atuais preservadas.
- Caminhão novo usa a data da operação; término deve ser posterior ao início e duração inferior a dois minutos pede conferência.
- Salvamento de caminhão bloqueia requisições simultâneas, inclusive entre os dois botões; combustível e manutenção respeitam gravação em andamento.
- Busca textual nas listas administrativas carregadas de funcionários, apanhas, combustível, manutenção e financeiro; data visível na apanha.
- Melhorias de contraste e espaço dos indicadores; mensagem de credenciais inválidas em português.

## Verificado

`node qa/operational_audit.mjs`: 14 regressões funcionais, além da sintaxe de todos os scripts externos e inline. Inclui falha real de CSV, consumo anômalo, renderização de combustível, histórico de arquivados e concorrência de salvamento.
`python qa/reference_audit.py` e `python qa/release_scorecard.py`: contratos estruturais aprovados. Essas notas são verificações estáticas; não representam aprovação integral de segurança ou usabilidade.
Banco: versão da migração, definição da visão, security_invoker, receita e contagem verificados após aplicação. Assessoria de segurança sem novos avisos frente à consulta anterior.

## Ainda requer validação ou trabalho

A sessão autenticada do navegador não estava mais disponível durante a correção. A operação real de campo, câmera, impressão Bluetooth, perda e retorno de internet e sincronização entre aparelhos não foram homologadas nesta entrega.

Os hodômetros históricos, totais de aves divergentes, cadastros de granjas, preços antigos e biometria ausente precisam de conferência operacional. Nenhum dado histórico foi inventado ou alterado. Fórmula de caixas vazias/perdas e ajustes de apanhas concluídas precisam de regra de negócio explícita e trilha de auditoria antes de automatizar recálculos.

Integração contábil de combustível, manutenção e estoque continua pendente de conciliação dos vínculos para impedir duplicidade. O saldo está claramente indicado como parcial.

A restrição de tipo dos engates é da interface; validação equivalente no banco depende de classificação estruturada dos veículos. Não se alterou a RPC existente nem as permissões dos aparelhos.

Fiscal sem integração, cobertura de alertas, detalhes de autor/antes/depois no histórico, paginação completa e filtros estruturados continuam no backlog da auditoria.

Avisos existentes no Supabase: 29 funções SECURITY DEFINER acessíveis a autenticados exigem revisão individual; proteção contra senhas vazadas desativada; tabela interna de material de assinatura Android sem policy está fechada por RLS (não abrir acesso).
Referências: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable e https://supabase.com/docs/guides/auth/password-security.

PRs anteriores, incluindo R100 e Bluetooth Android, foram preservados sem merge automático.

## Segunda rodada solicitada pelo usuário

Quatro regressões novas foram reproduzidas na atualização concorrente antes de corrigir:

1. Aviso de biometria fez 16 consultas em 750 ms numa tela parada; o próprio HTML disparava a próxima consulta. Aplicado intervalo de atualização por empresa/tela e atualização manual explícita.
2. Falha de rede retornava array vazio e exibia 0/0 como se todos tivessem biometria. Agora informa indisponibilidade.
3. Filtros de apanha reescreviam as opções e datas continuamente (18 mutações no teste parado). Só atualizam conteúdo quando muda.
4. Conciliação buscava manutenção em tabela diferente da usada pelo formulário e podia aprovar conciliação apenas por igualdade de totais. Corrigidas a origem dos custos, exclusão de cancelados e mensagem de conferência por vínculo; falha de consulta deixa aviso visível.

`qa/integrity_regressions.mjs`: 4 falhas reproduzidas antes; 4 casos aprovados depois. Testes de DOM com jsdom, sem dados reais, não substituem inspeção visual ou operação de campo.
Filtros duplicados de RH/apanha removidos na integração. Rótulos acessíveis e área de toque dos filtros ajustados. Preservados os avisos de preços, biometria e fiscal adicionados pela versão concorrente; a verificação visual autenticada permanece pendente.

### Inspeção autenticada retomada

Login de administrador confirmado no navegador. No painel publicado, a superfície decorativa de KPI usava título quase branco e valor branco sobre fundo branco; o valor ultrapassava o fundo do cartão. A barra lateral tinha largura útil de 221 px e conteúdo com 263 px. Corrigidos a grade da superfície, contraste claro/escuro, tamanho dos valores e quebra da marca; gráficos decorativos sem dados foram removidos dos KPIs.

O relatório de combustível ainda calculava distância por máximo menos mínimo, independentemente da ordem e das anomalias. Agora usa os mesmos intervalos validados da tela de combustível. O resumo de manutenção do painel também passa a distinguir ausência de programação. Sessão de campo real ainda não ativada.

### Retomada em 24/09: erro intermitente no campo

A execução de 1.000 jornadas completou todas as jornadas, mas identificou um TypeError ao abrir nova apanha no perfil de campo: o formulário removia campos opcionais durante o carregamento assíncrono e o manipulador acessava `value` em um elemento ausente. O reset agora verifica a presença dos campos opcionais. A regressão reproduz a remoção durante a espera. Também foi corrigida a cor de preenchimento do texto da marca no menu lateral.

Resultados anteriores a esta correção: Quality Gate, Security Contract, Field Torture (30 verificações), Reference Browser QA e Profile Stress 3000 aprovados. User Stress 1000 reprovado por esse único erro de JavaScript; requer nova execução antes da publicação.
