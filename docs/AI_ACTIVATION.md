# Configuração da IA do Comando360

As funções `controla-ai` e `comando360-daily-ai` usam `gpt-5-mini` pela Responses API. Cada solicitação tem prazo de execução, saída limitada a 4.096 tokens e `store: false`.

## Credencial no servidor

1. `OPENAI_API_KEY` no ambiente da Edge Function tem prioridade.
2. Quando essa variável está ausente, o cliente de servidor busca a entrada criptografada `comando360_openai_api_key` no Supabase Vault pela RPC `v2_ai_server_key()`.

A RPC usa `SECURITY INVOKER`, tem `search_path` vazio e só permite `EXECUTE` ao `service_role`. Os clientes `anon` e `authenticated` também não têm acesso à visão de segredos do Vault. O cliente privilegiado é criado depois da autenticação e da verificação de acesso à empresa. A busca tem prazo de cinco segundos.

A chave deve pertencer à organização OpenAI que possui os créditos. Configure o valor por um canal privado autorizado. Segredos não devem entrar no código, em migrações, em respostas da API nem em logs.

## Comportamento

- A consulta de saúde verifica a configuração sem chamar o modelo ou criar uma conversa.
- Uma falha na busca do segredo interrompe a análise antes da criação de mensagens.
- Falta de saldo, credencial recusada e limite de solicitações têm mensagens específicas e não expõem a resposta bruta do provedor.
- A confirmação de uma ação existente continua disponível sem depender do modelo ou da busca de credenciais.
- Leituras de presença geram uma prévia para revisão. Nomes ambíguos continuam pendentes; a função não grava presença, ponto ou folha.
- Propostas do assistente continuam dependendo de confirmação humana e da RPC transacional existente para registrar dados.

## Verificação

```sh
node qa/assistant_backend_regressions_20261007.mjs
node qa/daily_ai_backend_regressions_20261019.mjs
```

Depois de configurar a credencial, use uma sessão real do app para verificar a saúde, fazer uma consulta sobre os dados da empresa e revisar uma extração de foto. Os testes unitários usam dados sintéticos e não substituem essa validação.

A migração versionada cria somente a leitura de servidor. Migrações operacionais de transferência de chave são temporárias e não devem ser reaplicadas. Nenhuma função pública de instalação faz parte do aplicativo.
