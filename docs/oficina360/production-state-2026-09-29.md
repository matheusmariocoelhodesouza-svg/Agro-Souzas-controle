# Oficina 360 — estado de produção em 29/09/2026

## Escopo

Este documento registra o estado efetivamente validado no projeto Supabase `comando360` após o PR #84 (`feat(Oficina 360): aprofunda diagnóstico de toda a frota`).

## Ativação aplicada em produção

Foram aplicadas com sucesso três migrations direcionadas e auditáveis:

1. `oficina360_fleet_diagnostic_depth_activation_v1`
   - fontes técnicas e gates de confirmação física;
   - Mapa Elétrico aplicável à frota;
   - arquitetura eletrônica condicional do Comil;
   - arquitetura mecânica correta de Volare e 608;
   - gate de tensão da 608;
   - mapeamento físico do reboque;
   - ligações funcionais sem pinagem inventada.

2. `oficina360_fleet_vehicle_symptom_playbooks_activation_v1`
   - Comil: perda de força, não-partida, freio a ar e superaquecimento;
   - Volare: não-partida, partida difícil, fumaça preta/perda de rendimento e superaquecimento;
   - 608: não-partida, partida difícil, fumaça preta/perda de rendimento, assistência de freio e superaquecimento;
   - reboque: iluminação/chicote e roda/cubo/rolamento.

3. `oficina360_targeted_performance_hardening_v1`
   - políticas de leitura das tabelas compartilhadas de diagnóstico direcionadas ao papel `authenticated`, eliminando reavaliação de `auth.uid()` por linha;
   - 8 índices de apoio para FKs diretamente relacionadas ao catálogo/oficina.

## Validação pós-deploy

Resultado validado diretamente no banco:

| Veículo | Fontes técnicas | Nós elétricos | Ligações elétricas | Playbooks ativos | Fleet Depth V1 |
|---|---:|---:|---:|---:|---:|
| Comil CPI6C79 | 13 | 84 | 3 | 4 | 4 |
| Volare MBJ1166 | 15 | 60 | 0 | 4 | 4 |
| Mercedes 608 BYH8J61 | 14 | 55 | 0 | 5 | 5 |
| Reboque QSR7H50 | 1 | 6 | 3 | 2 | 2 |
| **Total de playbooks V1** |  |  |  | **15** | **15** |

As verificações binárias de contrato passaram para:

- fonte/gate de variante do Comil;
- `comil_variant_gate`;
- arquitetura mecânica do Volare (`MECH-DIESEL-NO-ECU`);
- árvore de injeção mecânica do Volare;
- arquitetura mecânica OM314 da 608 (`OM314-NO-ECU`);
- gate de tensão da 608 (`VOLTAGE-GATE` + `608_ns_voltage_gate`);
- árvore de injeção mecânica da 608;
- mapeamento físico do plugue do reboque;
- árvore de roda/cubo do reboque.

O arquivo `qa/oficina360_fleet_diagnostic_depth_postdeploy.sql` transforma essas verificações em contrato executável.

## Princípios preservados

- `catalog_reference_verified != physical_fitment_verified`;
- medir antes de substituir;
- nenhum DTC ou sintoma isolado condena peça automaticamente;
- Comil usa scanner/common rail apenas como arquitetura candidata até confirmação física da variante;
- Volare 4.07 TCA e 608 OM314 não recebem common rail/ECU de motor fictícios;
- a 608 não recebe tensão nominal presumida;
- reboque não recebe pinagem ou torque inventados.

## Segurança revisada

O Supabase Advisor sinaliza `v2_android_signing_material` por RLS sem policy. A inspeção confirmou que isso é intencional e seguro no estado atual: RLS está ativo, não existe policy e não há grant para `anon`, `authenticated` ou `public`. Portanto, clientes não têm acesso ao material de assinatura e o alerta não deve ser “corrigido” abrindo acesso.

Também existem funções `SECURITY DEFINER` usadas por ponto, dispositivos, sincronizações e rotinas internas. A maioria tem `search_path` explicitamente definido e permissões limitadas a papéis esperados. Elas não devem ser convertidas em massa para `SECURITY INVOKER`, pois isso pode quebrar os fluxos que dependem de execução privilegiada controlada.

## Performance

Após o hardening direcionado:

- os 2 avisos `auth_rls_initplan` relacionados ao diagnóstico foram eliminados;
- os FKs sem índice caíram de 132 para 124;
- os 8 novos índices aparecem inicialmente como “unused” porque acabaram de ser criados e ainda não acumularam tráfego — isso não é motivo para removê-los imediatamente;
- permanecem avisos amplos do Comando 360 que devem ser tratados por domínio e evidência de uso, não em lote.

## Regra de deploy do Supabase

**Não habilitar ainda um workflow genérico de `supabase db push`.**

O histórico remoto de `supabase_migrations.schema_migrations` usa versões/timestamps diferentes dos prefixos dos arquivos versionados no GitHub. Um `db push` automático sem reconciliação/baseline pode interpretar migrations antigas como pendentes e tentar reaplicá-las.

Antes de CI/CD automático de banco:

1. reconciliar o histórico remoto com o conjunto atual de arquivos;
2. definir baseline oficial;
3. testar o plano de migrations contra ambiente isolado;
4. só então habilitar deploy automático após merge no `main`.

Enquanto isso, migrations novas devem continuar sendo aplicadas de forma explícita e verificadas com contrato pós-deploy.
