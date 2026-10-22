# Configuração da IA do Comando360

## Conversa contínua (22/10/2026)

O Comando IA passa a enviar até 40 mensagens anteriores, em ordem, com limite de 48.000 caracteres, além de um resumo de continuidade de até 4.000 caracteres. As propostas estruturadas anteriores entram no contexto para permitir completar dados e corrigir informações sem começar do zero. O resumo é atualizado em `v2_ai_conversations.context.memory`; nenhuma tabela nova é necessária.

As leituras exigem usuário e empresa da conversa, além de `ai.use` e das políticas RLS existentes. Histórico fornecido pelo cliente não é aceito. Uma falha de leitura interrompe a consulta para evitar responder sem o contexto solicitado.

Os modos `conversations` e `history` permitem retomar conversas sem chamar o modelo ou consultar a chave. A interface guarda somente o ID da conversa por usuário/empresa, oferece Nova conversa, recupera mensagens ao reabrir e limpa o estado ao trocar usuário ou empresa. Os links de anexos antigos duram dez minutos. Fotos podem ser ampliadas. O botão flutuante abre o Comando IA nas telas administrativas.

O compositor aceita várias linhas (Shift+Enter), fotos coladas e até dez anexos no total. PDF, DOCX, XLSX, PPTX, CSV, TXT, MD, JSON, RTF e ODT são enviados como `input_file`, com até 10 MB por documento e 16 MB de dados codificados no conjunto. O ajuste de formatos do bucket está em `supabase/ops/20261022_ai_document_mime_types.sql`; ele preserva as permissões e o limite de armazenamento existentes. Cada proposta identifica também `source_document_indices` quando é sustentada por documentos.

O modelo permanece `gpt-5-mini`. O histórico e o resumo melhoram a continuidade; isso não equivale a todos os recursos do ChatGPT. Arquivos de turnos anteriores não são retransmitidos integralmente. A IA deve pedir reenvio quando faltar um detalhe que não esteja nas mensagens ou extrações. Alterações em registros continuam exigindo o botão de confirmação.

Verificação adicional: `node qa/assistant_conversation_regressions_20261022.mjs`. Os testes usam dados sintéticos; a resposta real do modelo requer uma sessão autenticada do aplicativo.

As funções `controla-ai` e `comando360-daily-ai` usam `gpt-5-mini` pela Responses API. Cada solicitação tem prazo de execução e `store: false`. O assistente limita a saída a 4.096 tokens em mensagens de texto ou uma foto; mensagens com várias fotos têm até 8.192 tokens e prazo de 50 segundos. A leitura de presença mantém o limite de 4.096 tokens.

## Várias imagens na conversa

Em **Galeria/arquivo**, selecione até dez fotos por mensagem. A câmera acrescenta uma foto por vez. A seleção é cumulativa; cada imagem tem prévia e botão de remoção. Os originais continuam limitados a 15 MB por foto e são arquivados individualmente. As cópias reduzidas para a IA têm limite conjunto de 12 MB.

O novo cliente envia `images: [{image_data_url, source_attachment}]`. O servidor valida todas as imagens e seus caminhos na empresa antes de gravar a conversa ou chamar a OpenAI. Clientes antigos com `image_data_url` e `source_attachment` continuam compatíveis. Os dois formatos não devem ser misturados.

As imagens chegam numeradas em uma única chamada. Cada ação informa `source_image_indices` para distinguir notas diferentes de páginas do mesmo documento. A proposta mantém todas as referências em `_sources`; `_source` guarda a principal e `related_attachments` quando há mais de uma página. Isso preserva a compatibilidade com a confirmação transacional existente e suas referências de anexos. Uma origem ambígua em um lote bloqueia a confirmação até a revisão.

Se houver falha no upload ou na análise, a seleção e a mensagem são preservadas. Os originais já arquivados são reutilizados ao tentar novamente.

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
node qa/assistant_multiple_images_20261019.mjs
```

Depois de configurar a credencial, use uma sessão real do app para verificar a saúde, fazer uma consulta sobre os dados da empresa e revisar uma extração de foto. Os testes unitários usam dados sintéticos e não substituem essa validação.

A migração versionada cria somente a leitura de servidor. Migrações operacionais de transferência de chave são temporárias e não devem ser reaplicadas. Nenhuma função pública de instalação faz parte do aplicativo.

