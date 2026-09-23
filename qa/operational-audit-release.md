# Correções da auditoria operacional — 23/09/2026

Base revisada: main c9573c0. Build de recursos: 2026.09.23-audit1. Cache PWA: hotfix60.

## Entregue

- CSV, AFD e AEJ voltam a ter a função de download. CSV escapa aspas e neutraliza fórmulas em campos de texto.
- Ponto carrega funcionários ao abrir; preserva seleção e permite consultar arquivados sem oferecê-los para nova biometria.
- Consumo fora de faixa, hodômetros regressivos e deslocamentos impossíveis ficam sinalizados e não contaminam o KPI de distância. A média entre abastecimentos é explicitamente estimativa. O histórico continua limitado aos 200 registros carregados.
- Novo combustível pede leitura do painel em vez de copiar automaticamente o cadastro possivelmente incorreto. Valores inválidos são rejeitados e anomalias pedem conferência.
- Carretinhas não aparecem como opção de combustível nem recebem indicador de tanque. Engates oferecem carretinhas identificadas, com validação adicional na interface.
- Manutenção sem vencimento mostra “Sem programação”; KM ausente deixa de aparecer como zero.
- Financeiro descreve competência e saldo parcial; não confunde vínculo de celular com presença online.
- Visão financeira do banco exclui cancelados e mantém security_invoker. Migração aplicada; receita atual de 32.828,04 e oito registros preservados.
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
