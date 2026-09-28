import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const specs=read('oficina360-spec-sheet.js');
const exploded=read('oficina360-exploded-browser-v1.js');
const deep=read('oficina360-deep-catalog.js');
const css=read('oficina360-exploded-browser-v1.css');
const html=read('oficina360.html');
const migration=read('supabase/migrations/20260928_oficina360_visual_provenance.sql');

assert.match(specs,/function activateSpecs\(\)/,'Ficha completa precisa de ativação própria');
assert.match(specs,/t\.id==='tab-specs'/,'Ficha completa deve ativar tab-specs');
assert.match(specs,/b\.dataset\.tab==='specs'/,'Ficha completa deve marcar o botão correto');
assert.match(specs,/load\(\)\.catch/,'Ficha completa deve carregar os dados ao abrir');

assert.match(exploded,/official_authorized/,'Vistas devem reconhecer imagem oficial autorizada');
assert.match(exploded,/licensed_partner/,'Vistas devem reconhecer imagem licenciada');
assert.match(exploded,/oficina360_reconstructed/,'Vistas devem reconhecer reconstrução Oficina 360');
assert.match(exploded,/validation_pending/,'Vistas devem reconhecer estado em validação');
assert.match(exploded,/insufficient_basis/,'Vistas devem reconhecer base insuficiente');
assert.match(exploded,/RECONSTRUÇÃO OFICINA 360/,'Reconstrução deve ser identificada explicitamente');
assert.match(exploded,/Baseada em pesquisa técnica • Não OEM/,'Reconstrução deve deixar claro que não é OEM');
assert.match(exploded,/function needsReconstruction/,'Fallback visual precisa ter regra central de prioridade');
assert.match(exploded,/can_store_image/,'Imagem externa só pode substituir reconstrução quando for armazenável');
assert.match(exploded,/o360-open-view/,'Vistas devem expor botão de abertura interativa');
assert.match(exploded,/o360-diagnose-view/,'Vistas devem expor ação de diagnóstico');
assert.match(exploded,/o360-source-view/,'Vistas devem expor fonte técnica quando aplicável');
assert.match(exploded,/data-fleet-view/,'Navegador deve localizar a prancha Premium correspondente');
assert.match(exploded,/pvSystem/,'Navegador deve selecionar o sistema técnico correspondente');
assert.match(exploded,/decorateDeep/,'Navegador deve tratar o layout do catálogo profundo');
assert.match(exploded,/\.o360-view-full/,'Navegador deve reconhecer as vistas profundas');
assert.match(exploded,/\.o360-view-table tbody tr/,'Fallback profundo deve reutilizar a numeração real dos itens catalogados');
assert.match(exploded,/IntersectionObserver/,'Prévia deve ser desenhada sob demanda no mobile');
assert.doesNotMatch(exploded,/new MutationObserver/,'Navegador explodido não pode observar toda a árvore e reprocessar tabelas');
assert.doesNotMatch(exploded,/setInterval\([^)]*miniSvg/,'Prévia não pode redesenhar continuamente');

assert.match(deep,/async function loadViewItems/,'Itens das vistas precisam carregar somente quando a vista for aberta');
assert.match(deep,/countViewItems/,'Total de posições deve ser contado sem baixar todos os registros');
assert.match(deep,/head:true/,'Contagem deve usar consulta head sem transferir as posições');
assert.match(deep,/data-o360-more-group/,'Grupos grandes precisam de paginação visual');
assert.match(deep,/async function renderPartBody/,'Detalhes completos da peça devem carregar só ao abrir');
assert.match(deep,/o360:view-rendered/,'Catálogo deve avisar quando a vista terminar o lazy load');
assert.doesNotMatch(deep,/state\.items\s*=\s*await chunks\('v2_vehicle_exploded_view_items'/,'Catálogo não pode baixar todas as posições de todas as vistas no carregamento inicial');
assert.doesNotMatch(deep,/v2_vehicle_components'\s*,state\.links\.map\(x=>x\.component_id\)\)\s*;/,'Catálogo não pode usar select * para todos os componentes ligados');

assert.match(css,/\.o360-generated-preview/,'Estilo da prévia precisa estar presente');
assert.match(css,/\.o360-provenance/,'Estilo da procedência visual precisa estar presente');
assert.match(css,/\.o360-card-origin/,'Selo da origem precisa estar presente no card');
assert.match(css,/\.o360-preview-badge\.official/,'Badge oficial precisa ter estilo próprio');
assert.match(css,/\.o360-preview-badge\.licensed/,'Badge licenciado precisa ter estilo próprio');
assert.match(css,/\.o360-preview-badge\.reconstructed/,'Badge reconstruído precisa ter estilo próprio');

assert.match(migration,/add column if not exists visual_type/,'Banco precisa guardar tipo visual');
assert.match(migration,/add column if not exists can_store_image/,'Banco precisa guardar permissão de armazenamento');
assert.match(migration,/add column if not exists visual_confidence/,'Banco precisa guardar confiança visual');
assert.match(migration,/runtime:oficina360-exploded-browser-v1/,'Reconstrução em runtime precisa ficar registrada');

assert.match(html,/oficina360-spec-sheet\.js\?v=20260928-2/,'Ficha completa precisa quebrar cache da versão antiga');
assert.match(html,/oficina360-deep-catalog\.js\?v=20260928-4/,'Hotfix do catálogo precisa quebrar cache');
assert.match(html,/oficina360-exploded-browser-v1\.js\?v=20260928-4/,'Hotfix das vistas precisa quebrar cache');

console.log('Oficina 360 specs + exploded provenance + mobile freeze contract: OK');