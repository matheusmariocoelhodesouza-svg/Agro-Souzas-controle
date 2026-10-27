# Oficina 360 Scan Pro — auditoria e entrega v0.1

Data: 27/10/2026, horário de São Paulo. Orçamento de R$ 10.000 reservado exclusivamente ao hardware futuro; desenvolvimento e consumo da IA são separados. Nenhum equipamento foi comprado.

## Base inspecionada

- Repositório: `matheusmariocoelhodesouza-svg/Agro-Souzas-controle`, `main` em `5a177713cfbf065945d1e9098aa8a931f614cca1`.
- Branch de implementação: `codex/oficina360-scan-pro-lab`. A aplicação em uso não é substituída por esta branch.
- Aplicação estática, sem etapa de build, com módulos JavaScript adicionais, Supabase compartilhado e wrapper Android. Preservar a composição atual; não reescrever o aplicativo para adicionar diagnóstico.
- Supabase `aycbrqziusxtxhsdfqjk`, ativo, PostgreSQL 17.6.1.155. O projeto separado `Loja-360` estava inativo e não pertence ao escopo.
- As fontes publicadas de `controla-ai` v14 e seus quatro helpers compartilhados coincidem exatamente com as fontes no GitHub. Esse serviço permanece intacto.
- Configuração OpenAI encontrada no servidor. Reutilização autorizada pelo usuário nesta conversa; nenhum segredo foi extraído para o cliente, para arquivos ou para o Git.
- Changelog e documentação atuais de RLS/Edge Functions consultados. A próxima restrição de cifras TLS antigas não exige alteração neste cliente moderno; deve ser considerada na escolha de hardware embarcado.

## O que já existia e foi preservado

| Área | Base encontrada | Decisão |
|---|---|---|
| Frota | `v2_vehicles` e perfis técnicos | Ler a identidade da condução pela sessão existente |
| Oficina | catálogo, vistas, especificações, elétrica e roteiros por sintomas | Manter os módulos e seus pontos de entrada |
| Serviços | `v2_work_orders`, diário e chat de acompanhamento | Nenhuma alteração operacional feita pelo Scan Pro |
| Scanner | `oficina360-live-scanner-v1.js`, snapshot atual, captura em diagnóstico | Preservar; o simulador não escreve nessas tabelas |
| Conversação | `controla-ai`, histórico por usuário/condução, SSE e commit atômico | Reutilizar chave e componentes estáveis em um endpoint separado |
| Acesso | sessão Supabase e políticas RLS | Validar usuário, empresa, permissão e veículo no servidor |
| Android/PWA | wrapper e cache próprios do Oficina | Adicionar laboratório com escopo de cache independente |

## Identidade da frota consultada

| Condução | Cadastro técnico atual | Tratamento do laboratório |
|---|---|---|
| Comil | MWM `4.12 TCE`, família X12 | ECU J1939 didática; aplicação física e serviços OEM pendentes |
| Sprinter 313 CDI 2011 | `OM611.981` | ECU OBD-II genérica didática; KWP/K-Line e serviços Mercedes pendentes |
| Volare | `4.07 TCA` | Instrumentação manual; não pressupor ECU ou CAN |
| Mercedes 608 | `OM314` | Motor mecânico; instrumentação manual, sem ECU inventada |

`identity_status=exact` no cadastro não comprova suporte de scanner. ECU, software, tensão, conector e protocolo real exigem identificação física. Perfis de laboratório não certificam compatibilidade.

## Entrega implementada

- Nova área `scan-pro/index.html`, com entrada adicional no menu do Oficina, ligada ao veículo selecionado. Os arquivos existentes receberam somente o link e seu script isolado.
- Simulador determinístico com cenários regular, baixa admissão, rail abaixo do alvo, temperatura elevada e perda de comunicação; acelerador virtual; intervalo de 1 segundo; pausa ao deixar a página.
- Decodificadores parciais OBD-II/J1939; receptor ISO-TP clássico com sequência, timeout e limite de canais; leitura UDS F190 e resposta negativa, incluindo pending.
- Quadros simulados passam pelos decodificadores. Sinais didáticos sem mapeamento OEM são identificados separadamente. Não se apresentam como PIDs proprietários reais.
- Cartões, gráfico, códigos, marcação de evidência e ensaios virtuais de ventoinha/equilíbrio. Nenhum comando físico é enviado.
- Registros manuais para os perfis mecânicos. Sem fabricação de leitura de ECU ou DTC.
- Gravações no IndexedDB, até 600 amostras e 20 sessões por escopo, exportação JSON/CSV e importação validada. CSV neutraliza valores que possam ser interpretados como fórmulas. Exporte cópias: armazenamento do navegador pode ser removido pelo usuário ou sistema.
- Roteiro local por regras, explicitamente identificado; não se apresenta como IA quando a OpenAI está indisponível ou não há sessão.
- Serviço isolado `oficina360-scan-pro-ai`, publicado no Supabase como v1, JWT obrigatório e autenticação adicional no corpo. Reutiliza a configuração OpenAI existente, modelo já adotado `gpt-5-mini` e helper de streaming existente.
- Histórico de conversas separado por usuário, empresa, condução e marcador `context.scan_pro=v1`. Apenas o servidor carrega o histórico. A IA recebe sempre sinais como dados simulados e não possui ferramentas de atuação ou registro operacional.
- O commit da resposta usa a RPC atômica existente `v2_ai_commit_turn`, com ações e entradas de diário vazias. Uma resposta provisória em streaming só ganha recibo de gravação após confirmação do banco.
- Contrato de transporte profissional preparado; drivers físicos, OEM e acesso de segurança continuam indisponíveis.

## Supabase: mudanças e observações

Nenhuma migration, tabela ou política existente foi alterada. Foi adicionada somente a Edge Function `oficina360-scan-pro-ai`. O laboratório local não grava sinais na nuvem. Conversas reais do Scan Pro, quando iniciadas pelo usuário autenticado, usam as tabelas de IA existentes e permanecem distinguíveis pelo marcador de contexto.

Verificação após publicar o endpoint: requisição sem credencial recusada com HTTP 401. As contagens continuavam em 7 veículos, 2 ordens de serviço, 0 snapshots atuais de scanner, 0 capturas de scanner e 11 conversas. Nenhuma conversa autenticada foi criada durante esta verificação.

O Advisor encontrou avisos preexistentes sobre funções `SECURITY DEFINER` executáveis por autenticados e duas tabelas com RLS sem política, usadas como armazenamento interno. Não substituir políticas internas por regras permissivas para eliminar avisos. Cada função privilegiada precisa de avaliação contextual própria.

Ponto de revisão antes de habilitar uma ponte física: políticas atuais de `v2_vehicle_scanner_current` contêm a expressão ambígua `v.company_id = v.company_id`. A tabela `v2_vehicles` também aplica RLS, mas essa expressão não valida explicitamente a correspondência entre empresa do pacote e empresa do veículo. Qualificar a referência externa e testar o cenário de contas com mais de uma empresa antes de aceitar ingestão física. O Scan Pro não depende dessas políticas nem grava nessa tabela.

O histórico de migrations existente contém nomes e versões antigos heterogêneos. **Não habilitar um workflow genérico de `supabase db push`** para esta entrega. Não há migration nova necessária para o laboratório.

## Validação executada

- 15 testes comportamentais novos: vetores conhecidos OBD/J1939, sentinelas de indisponibilidade, ISO-TP intercalado/timeout/rollover, UDS, cenários, perfis mecânicos, bloqueio físico, importação/exportação, preservação de procedência, streaming e autorização por conta/empresa/veículo.
- 18 regressões existentes de streaming, diário e contexto operacional aprovadas.
- 11 regressões existentes da interface conversacional aprovadas, com a mesma dependência jsdom 26.1.0 usada pelo CI do repositório.
- Contratos existentes aprovados: live scanner, estado de produção, frota premium, diagnóstico por sintomas e profundidade de diagnóstico da frota.
- Verificação manual no navegador: inicialização, sinais atualizados, perda de comunicação retirando valores atuais, perfil 608 com simulação e atuadores desabilitados, medição manual e roteiro local.
- Requisição real não autenticada ao novo endpoint retorna 401.

Limites desta validação: não houve teste com scanner físico, ECU real, driver nativo, pinagem, atuador real ou resposta OpenAI com a sessão do usuário. A integração autenticada está implementada e publicada, mas a conversa completa deve ser validada no mesmo domínio/sessão do Oficina 360. O site privado de demonstração usa apenas o laboratório e o roteiro local; não transporta a sessão da aplicação para outro domínio.

## Próxima etapa de aceitação

1. Revisar a branch e o laboratório privado; confirmar os comportamentos esperados com a frota sem promover ainda a interface ao aplicativo em uso.
2. Validar a conversa OpenAI numa sessão de teste autorizada no domínio do Oficina, mantendo leituras como simulação.
3. Confirmar ECU/plaqueta, conectores, alimentação e variantes físicas da frota.
4. Escolher interface documentada e protegida dentro do teto de hardware; construir agente nativo somente depois dessa escolha.
5. Validar leitura física e rastreabilidade por ECU; depois tratar cada função bidirecional OEM como uma capacidade individual, com critérios próprios.

## Referências primárias consultadas

- https://docs.kernel.org/networking/iso15765-2.html
- https://docs.kernel.org/networking/can.html
- https://kvaser.com/about-can/higher-layer-protocols/j1939-introduction/
- https://www.elmelectronics.com/wp-content/uploads/2017/01/ELM327DS.pdf
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/changelog/cbc-tls-ciphers-deprecated
- https://developers.openai.com/api/docs/guides/streaming-responses

Essas referências não substituem a documentação OEM nem fornecem licença para bancos proprietários de scanner. Os testes usam vetores mínimos e implementações próprias; não incorporam um banco DBC comercial.
