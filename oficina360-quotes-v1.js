(()=>{
'use strict';

const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=v=>v?new Date(String(v).length===10?v+'T12:00:00':v).toLocaleDateString('pt-BR'):'—';
const num=v=>Number(String(v??0).replace(',','.'))||0;
const todayPlus=days=>{const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};

const labels={
  draft:'Rascunho',sent:'Enviado',approved:'Aprovado',rejected:'Recusado',change_requested:'Alteração solicitada',converted:'Convertido em OS',expired:'Vencido',
  essential:'Essencial',recommended:'Recomendado',complete:'Completo',part:'Peça',labor:'Mão de obra',outsourced:'Terceirizado'
};

const state={client:null,session:null,vehicle:null,companyId:null,quotes:[],items:new Map(),inventory:[],editing:null,loading:false};

function toast(message){
  const el=$('#toast');
  if(!el){alert(message);return}
  el.textContent=message;el.classList.add('show');
  clearTimeout(window.__o360QuotesToast);window.__o360QuotesToast=setTimeout(()=>el.classList.remove('show'),2800);
}
function fail(label,error){console.error(label,error);toast(label+(error?.message?': '+error.message:''));}
function qError(result,label){if(result?.error)throw new Error(label+': '+result.error.message);return result?.data??[]}
function quoteCode(q){return 'ORC-'+new Date(q.created_at||Date.now()).getFullYear()+'-'+String(q.quote_number||0).padStart(4,'0')}
function margin(q){const profit=Number(q.total_amount||0)-Number(q.total_cost||0);const pct=Number(q.total_amount||0)>0?(profit/Number(q.total_amount))*100:0;return {profit,pct};}
function statusClass(s){return s==='approved'||s==='converted'?'ok':s==='rejected'||s==='expired'?'danger':s==='sent'||s==='change_requested'?'warn':'neutral'}

async function boot(){
  if(!$('#tab-quotes'))return;
  if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){setTimeout(boot,180);return}
  state.client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const {data:{session}}=await state.client.auth.getSession();
  state.session=session;if(!session)return;
  bind();
  await syncContext();
}

function bind(){
  $('#quoteNewBtn')?.addEventListener('click',()=>openEditor());
  $('#quoteRefreshBtn')?.addEventListener('click',()=>loadAll(true));
  $('#quoteStatusFilter')?.addEventListener('change',render);
  $('#quoteSearch')?.addEventListener('input',render);
  $('#vehiclePicker')?.addEventListener('change',()=>setTimeout(syncContext,0));
  document.querySelector('[data-tab="quotes"]')?.addEventListener('click',()=>{
    setTimeout(()=>{const t=$('#pageTitle');if(t)t.textContent='Orçamentos';loadAll();},0);
  });
  $('#quotesList')?.addEventListener('click',handleListAction);
}

async function syncContext(){
  const id=$('#vehiclePicker')?.value;
  if(!id)return;
  try{
    const r=await state.client.from('v2_vehicles').select('id,company_id,plate,description,make,model,model_year,current_odometer_km').eq('id',id).single();
    if(r.error)throw r.error;
    state.vehicle=r.data;state.companyId=r.data.company_id;
    await loadAll(true);
  }catch(e){fail('Falha ao sincronizar o veículo dos orçamentos',e)}
}

async function loadAll(force=false){
  if(!state.companyId||!state.vehicle?.id||state.loading)return;
  if(!force&&state.quotes.length&&state.quotes.every(q=>q.vehicle_id===state.vehicle.id)){render();return}
  state.loading=true;renderLoading();
  try{
    const [quotesR,invR]=await Promise.all([
      state.client.from('v2_quotes').select('*').eq('company_id',state.companyId).eq('vehicle_id',state.vehicle.id).order('created_at',{ascending:false}),
      state.client.from('v2_inventory_items').select('id,sku,name,current_avg_cost,unit,status').eq('company_id',state.companyId).eq('status','active').order('name')
    ]);
    state.quotes=qError(quotesR,'Falha ao carregar orçamentos');
    state.inventory=qError(invR,'Falha ao carregar estoque');
    const ids=state.quotes.map(q=>q.id);
    state.items=new Map();
    if(ids.length){
      const itemsR=await state.client.from('v2_quote_items').select('*').in('quote_id',ids).order('sort_order').order('created_at');
      qError(itemsR,'Falha ao carregar itens').forEach(i=>{if(!state.items.has(i.quote_id))state.items.set(i.quote_id,[]);state.items.get(i.quote_id).push(i)});
    }
    render();
  }catch(e){fail('Não foi possível carregar os orçamentos',e);render()}
  finally{state.loading=false}
}

function renderLoading(){const el=$('#quotesList');if(el)el.innerHTML='<div class="quote-empty">Carregando orçamentos...</div>';}

function render(){
  renderKpis();
  const list=$('#quotesList');if(!list)return;
  const status=$('#quoteStatusFilter')?.value||'';
  const needle=String($('#quoteSearch')?.value||'').trim().toLocaleLowerCase('pt-BR');
  const rows=state.quotes.filter(q=>(!status||q.status===status)&&(!needle||[quoteCode(q),q.customer_name,q.title,q.reported_issue].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(needle)));
  if(!rows.length){list.innerHTML='<div class="quote-empty"><b>Nenhum orçamento neste filtro.</b><span>Crie o primeiro orçamento para esta condução.</span></div>';return}
  list.innerHTML=rows.map(renderCard).join('');
}

function renderKpis(){
  const el=$('#quotesSummary');if(!el)return;
  const open=state.quotes.filter(q=>['draft','sent','change_requested'].includes(q.status)).length;
  const approved=state.quotes.filter(q=>q.status==='approved').length;
  const converted=state.quotes.filter(q=>q.status==='converted').length;
  const pipeline=state.quotes.filter(q=>!['rejected','expired'].includes(q.status)).reduce((s,q)=>s+Number(q.total_amount||0),0);
  el.innerHTML=[['EM ABERTO',open,'aguardando fechamento'],['APROVADOS',approved,'prontos para virar OS'],['CONVERTIDOS',converted,'já ligados a uma OS'],['VALOR EM ORÇAMENTOS',money(pipeline),'exclui recusados/vencidos']].map(x=>'<div class="kpi-card"><div class="kpi-label">'+x[0]+'</div><div class="kpi-value">'+x[1]+'</div><div class="kpi-note">'+x[2]+'</div></div>').join('');
}

function renderCard(q){
  const m=margin(q),items=state.items.get(q.id)||[];
  const buttons=[
    '<button class="btn soft quote-action" data-action="edit" data-id="'+q.id+'">Editar</button>',
    '<button class="btn soft quote-action" data-action="print" data-id="'+q.id+'">PDF / Imprimir</button>',
    '<button class="btn soft quote-action" data-action="whatsapp" data-id="'+q.id+'">WhatsApp</button>'
  ];
  if(q.status==='draft'||q.status==='change_requested')buttons.push('<button class="btn soft quote-action" data-action="sent" data-id="'+q.id+'">Marcar enviado</button>');
  if(['draft','sent','change_requested'].includes(q.status)){
    buttons.push('<button class="btn quote-success quote-action" data-action="approved" data-id="'+q.id+'">Aprovar</button>');
    buttons.push('<button class="btn soft quote-action" data-action="change_requested" data-id="'+q.id+'">Pedir alteração</button>');
    buttons.push('<button class="btn quote-danger quote-action" data-action="rejected" data-id="'+q.id+'">Recusar</button>');
  }
  if(q.status==='approved')buttons.push('<button class="btn primary quote-action" data-action="convert" data-id="'+q.id+'">Transformar em OS</button>');
  return '<article class="quote-card">'+
    '<div class="quote-card-head"><div><div class="quote-code">'+esc(quoteCode(q))+'</div><h3>'+esc(q.title||'Orçamento')+'</h3><p>'+esc(q.customer_name||'Cliente não informado')+' • '+esc(state.vehicle?.plate||'Sem placa')+' • '+items.length+' item(ns)</p></div><div class="quote-head-right"><span class="chip '+statusClass(q.status)+'">'+esc(labels[q.status]||q.status)+'</span><span class="quote-tier tier-'+esc(q.quote_tier)+'">'+esc(labels[q.quote_tier]||q.quote_tier)+'</span></div></div>'+
    '<div class="quote-money-grid"><div><span>Total cliente</span><b>'+money(q.total_amount)+'</b></div><div class="internal"><span>Custo interno</span><b>'+money(q.total_cost)+'</b></div><div class="internal"><span>Lucro bruto</span><b>'+money(m.profit)+'</b></div><div class="internal"><span>Margem</span><b>'+m.pct.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%</b></div></div>'+
    '<div class="quote-card-meta"><span>Validade: '+date(q.valid_until)+'</span><span>Peças: '+money(q.subtotal_parts)+'</span><span>Mão de obra: '+money(q.subtotal_labor)+'</span><span>Terceiros: '+money(q.subtotal_outsourced)+'</span><span>Desconto: '+money(q.discount_amount)+'</span></div>'+
    '<div class="quote-actions">'+buttons.join('')+'</div></article>';
}

async function handleListAction(ev){
  const btn=ev.target.closest('[data-action][data-id]');if(!btn)return;
  const q=state.quotes.find(x=>x.id===btn.dataset.id);if(!q)return;
  const action=btn.dataset.action;
  if(action==='edit')return openEditor(q);
  if(action==='print')return printQuote(q);
  if(action==='whatsapp')return shareWhatsApp(q);
  if(action==='convert')return convertToWorkOrder(q);
  if(['sent','approved','rejected','change_requested'].includes(action))return setStatus(q,action);
}

function itemRow(item={}){
  const invOptions=['<option value="">Sem vínculo com estoque</option>'].concat(state.inventory.map(i=>'<option value="'+i.id+'" '+(item.inventory_item_id===i.id?'selected':'')+'>'+esc(i.name)+(i.sku?' • '+esc(i.sku):'')+'</option>')).join('');
  return '<div class="quote-item-row" data-row>'+(
    '<select data-field="item_type"><option value="part" '+((item.item_type||'part')==='part'?'selected':'')+'>Peça</option><option value="labor" '+(item.item_type==='labor'?'selected':'')+'>Mão de obra</option><option value="outsourced" '+(item.item_type==='outsourced'?'selected':'')+'>Terceirizado</option></select>'+ 
    '<input data-field="description" value="'+esc(item.description||'')+'" placeholder="Descrição" required>'+ 
    '<input data-field="part_number" value="'+esc(item.part_number||'')+'" placeholder="Código / peça">'+
    '<input data-field="quantity" type="number" min="0.001" step="0.001" value="'+esc(item.quantity??1)+'" title="Quantidade">'+
    '<input data-field="unit_cost" type="number" min="0" step="0.01" value="'+esc(item.unit_cost??0)+'" title="Custo interno">'+
    '<input data-field="unit_price" type="number" min="0" step="0.01" value="'+esc(item.unit_price??0)+'" title="Preço cliente">'+
    '<select data-field="inventory_item_id" title="Vínculo com estoque">'+invOptions+'</select>'+ 
    '<button type="button" class="quote-remove-item" title="Remover">×</button>')+'</div>';
}

function openEditor(q=null){
  state.editing=q||null;
  const items=q?(state.items.get(q.id)||[]):[];
  const modal=document.createElement('div');modal.className='quote-modal-backdrop';modal.id='quoteModal';
  modal.innerHTML='<div class="quote-modal"><div class="quote-modal-head"><div><span class="eyebrow">ORÇAMENTOS</span><h2>'+(q?'Editar '+esc(quoteCode(q)):'Novo orçamento')+'</h2></div><button type="button" class="quote-close" aria-label="Fechar">×</button></div>'+
    '<form id="quoteForm"><div class="quote-form-grid">'+
      '<label class="span2">Título<input name="title" value="'+esc(q?.title||'Orçamento de serviço')+'" required></label>'+ 
      '<label>Nível<select name="quote_tier"><option value="essential" '+(q?.quote_tier==='essential'?'selected':'')+'>Essencial</option><option value="recommended" '+((q?.quote_tier||'recommended')==='recommended'?'selected':'')+'>Recomendado</option><option value="complete" '+(q?.quote_tier==='complete'?'selected':'')+'>Completo</option></select></label>'+ 
      '<label>Tipo de serviço<select name="maintenance_type"><option value="corrective">Corretiva</option><option value="preventive" '+(q?.maintenance_type==='preventive'?'selected':'')+'>Preventiva</option><option value="inspection" '+(q?.maintenance_type==='inspection'?'selected':'')+'>Inspeção</option><option value="electrical" '+(q?.maintenance_type==='electrical'?'selected':'')+'>Elétrica</option><option value="tire" '+(q?.maintenance_type==='tire'?'selected':'')+'>Pneus</option><option value="other" '+(q?.maintenance_type==='other'?'selected':'')+'>Outro</option></select></label>'+ 
      '<label>Cliente<input name="customer_name" value="'+esc(q?.customer_name||'')+'" placeholder="Nome / empresa"></label>'+ 
      '<label>WhatsApp<input name="customer_phone" value="'+esc(q?.customer_phone||'')+'" placeholder="(15) 99999-9999"></label>'+ 
      '<label>CPF/CNPJ<input name="customer_document" value="'+esc(q?.customer_document||'')+'"></label>'+ 
      '<label>E-mail<input name="customer_email" type="email" value="'+esc(q?.customer_email||'')+'"></label>'+ 
      '<label>Hodômetro<input name="odometer_km" type="number" min="0" step="1" value="'+esc(q?.odometer_km??state.vehicle?.current_odometer_km??'')+'"></label>'+ 
      '<label>Validade<input name="valid_until" type="date" value="'+esc(q?.valid_until||todayPlus(7))+'"></label>'+ 
      '<label class="span2">Defeito relatado<textarea name="reported_issue" rows="2">'+esc(q?.reported_issue||'')+'</textarea></label>'+ 
      '<label class="span2">Diagnóstico<textarea name="diagnosis" rows="2">'+esc(q?.diagnosis||'')+'</textarea></label>'+ 
      '<label>Prazo do serviço<input name="delivery_estimate" value="'+esc(q?.delivery_estimate||'')+'" placeholder="Ex.: 2 dias úteis"></label>'+ 
      '<label>Pagamento<input name="payment_terms" value="'+esc(q?.payment_terms||'')+'" placeholder="Ex.: PIX / 3x cartão"></label>'+ 
      '<label>Desconto (R$)<input name="discount_amount" type="number" min="0" step="0.01" value="'+esc(q?.discount_amount??0)+'"></label>'+ 
      '<label class="span2">Observações<textarea name="notes" rows="2">'+esc(q?.notes||'')+'</textarea></label>'+ 
    '</div><div class="quote-items-head"><div><b>Itens do orçamento</b><small>Custo é interno; preço é o que o cliente vê.</small></div><div class="quote-item-adds"><button type="button" class="btn soft" data-add-item="part">+ Peça</button><button type="button" class="btn soft" data-add-item="labor">+ Mão de obra</button><button type="button" class="btn soft" data-add-item="outsourced">+ Terceiro</button></div></div>'+ 
    '<div class="quote-item-legend"><span>Tipo</span><span>Descrição</span><span>Código</span><span>Qtd.</span><span>Custo interno</span><span>Preço cliente</span><span>Estoque</span><span></span></div>'+ 
    '<div id="quoteItemsEditor">'+(items.length?items.map(itemRow).join(''):itemRow({item_type:'labor',description:'Mão de obra',quantity:1}))+'</div>'+ 
    '<div id="quoteLiveTotals" class="quote-live-totals"></div>'+ 
    '<div class="quote-modal-actions"><button type="button" class="btn soft quote-cancel">Cancelar</button><button type="submit" class="btn primary">Salvar orçamento</button></div></form></div>';
  document.body.appendChild(modal);
  modal.querySelector('.quote-close').addEventListener('click',()=>modal.remove());
  modal.querySelector('.quote-cancel').addEventListener('click',()=>modal.remove());
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove()});
  modal.querySelectorAll('[data-add-item]').forEach(b=>b.addEventListener('click',()=>{const box=$('#quoteItemsEditor');box.insertAdjacentHTML('beforeend',itemRow({item_type:b.dataset.addItem,description:b.dataset.addItem==='labor'?'Mão de obra':'',quantity:1}));wireRows();updateLiveTotals()}));
  $('#quoteForm').addEventListener('submit',saveEditor);
  wireRows();updateLiveTotals();
}

function wireRows(){
  document.querySelectorAll('#quoteItemsEditor [data-row]').forEach(row=>{
    if(row.dataset.wired)return;row.dataset.wired='1';
    row.querySelector('.quote-remove-item').addEventListener('click',()=>{row.remove();updateLiveTotals()});
    row.querySelectorAll('input,select').forEach(x=>x.addEventListener('input',updateLiveTotals));
    row.querySelector('[data-field="inventory_item_id"]').addEventListener('change',e=>{
      const inv=state.inventory.find(i=>i.id===e.target.value);if(!inv)return;
      row.querySelector('[data-field="description"]').value=inv.name||'';
      row.querySelector('[data-field="part_number"]').value=inv.sku||'';
      row.querySelector('[data-field="unit_cost"]').value=Number(inv.current_avg_cost||0).toFixed(2);
      row.querySelector('[data-field="item_type"]').value='part';updateLiveTotals();
    });
  });
}

function editorItems(){
  return [...document.querySelectorAll('#quoteItemsEditor [data-row]')].map((row,index)=>({
    item_type:row.querySelector('[data-field="item_type"]').value,
    description:row.querySelector('[data-field="description"]').value.trim(),
    part_number:row.querySelector('[data-field="part_number"]').value.trim()||null,
    quantity:num(row.querySelector('[data-field="quantity"]').value),
    unit_cost:num(row.querySelector('[data-field="unit_cost"]').value),
    unit_price:num(row.querySelector('[data-field="unit_price"]').value),
    inventory_item_id:row.querySelector('[data-field="inventory_item_id"]').value||null,
    sort_order:index
  })).filter(i=>i.description&&i.quantity>0);
}

function updateLiveTotals(){
  const items=editorItems(),discount=num(document.querySelector('#quoteForm [name="discount_amount"]')?.value);
  const sale=items.reduce((s,i)=>s+i.quantity*i.unit_price,0),cost=items.reduce((s,i)=>s+i.quantity*i.unit_cost,0),total=Math.max(0,sale-discount),profit=total-cost,pct=total>0?profit/total*100:0;
  const el=$('#quoteLiveTotals');if(!el)return;
  el.innerHTML='<div><span>Subtotal</span><b>'+money(sale)+'</b></div><div><span>Desconto</span><b>'+money(discount)+'</b></div><div><span>Total cliente</span><b>'+money(total)+'</b></div><div class="internal"><span>Custo interno</span><b>'+money(cost)+'</b></div><div class="internal"><span>Lucro bruto</span><b>'+money(profit)+'</b></div><div class="internal"><span>Margem</span><b>'+pct.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%</b></div>';
}

async function saveEditor(ev){
  ev.preventDefault();
  const form=ev.currentTarget,btn=form.querySelector('[type="submit"]');btn.disabled=true;btn.textContent='Salvando...';
  try{
    const fd=new FormData(form),items=editorItems();
    if(!items.length)throw new Error('Adicione ao menos um item ao orçamento.');
    const payload={
      company_id:state.companyId,vehicle_id:state.vehicle.id,quote_tier:fd.get('quote_tier'),maintenance_type:fd.get('maintenance_type'),title:String(fd.get('title')||'').trim(),
      customer_name:String(fd.get('customer_name')||'').trim()||null,customer_document:String(fd.get('customer_document')||'').trim()||null,
      customer_phone:String(fd.get('customer_phone')||'').trim()||null,customer_email:String(fd.get('customer_email')||'').trim()||null,
      reported_issue:String(fd.get('reported_issue')||'').trim()||null,diagnosis:String(fd.get('diagnosis')||'').trim()||null,
      odometer_km:fd.get('odometer_km')?num(fd.get('odometer_km')):null,valid_until:fd.get('valid_until')||null,
      delivery_estimate:String(fd.get('delivery_estimate')||'').trim()||null,payment_terms:String(fd.get('payment_terms')||'').trim()||null,
      discount_amount:num(fd.get('discount_amount')),notes:String(fd.get('notes')||'').trim()||null,
      metadata:{vehicle_snapshot:{plate:state.vehicle.plate,description:state.vehicle.description,make:state.vehicle.make,model:state.vehicle.model,model_year:state.vehicle.model_year}}
    };
    let quoteId=state.editing?.id;
    if(quoteId){
      const r=await state.client.from('v2_quotes').update(payload).eq('id',quoteId).eq('company_id',state.companyId).select('id').single();if(r.error)throw r.error;
      const del=await state.client.from('v2_quote_items').delete().eq('quote_id',quoteId).eq('company_id',state.companyId);if(del.error)throw del.error;
    }else{
      const r=await state.client.from('v2_quotes').insert(payload).select('id').single();if(r.error)throw r.error;quoteId=r.data.id;
    }
    const itemPayload=items.map(i=>({...i,quote_id:quoteId,company_id:state.companyId}));
    const ins=await state.client.from('v2_quote_items').insert(itemPayload);if(ins.error)throw ins.error;
    $('#quoteModal')?.remove();state.editing=null;await loadAll(true);toast('Orçamento salvo com sucesso.');
  }catch(e){fail('Não foi possível salvar o orçamento',e);btn.disabled=false;btn.textContent='Salvar orçamento';}
}

async function setStatus(q,status){
  try{
    const r=await state.client.from('v2_quotes').update({status}).eq('id',q.id).eq('company_id',state.companyId).select('id').single();if(r.error)throw r.error;
    await loadAll(true);toast('Status: '+(labels[status]||status));
  }catch(e){fail('Não foi possível alterar o status',e)}
}

async function convertToWorkOrder(q){
  if(q.status!=='approved')return toast('Apenas orçamento aprovado pode virar OS.');
  try{
    const r=await state.client.rpc('v2_convert_quote_to_work_order',{p_quote_id:q.id});if(r.error)throw r.error;
    await loadAll(true);toast('Orçamento convertido em OS com sucesso.');
    setTimeout(()=>$('#refreshBtn')?.click(),0);
  }catch(e){fail('Não foi possível criar a OS',e)}
}

function clientFacingTotals(q){return Number(q.total_amount||0)}
function printQuote(q){
  const items=state.items.get(q.id)||[];
  const w=window.open('','_blank','noopener,noreferrer');if(!w)return toast('Libere pop-ups para gerar o PDF.');
  const v=state.vehicle||{},code=quoteCode(q);
  const rows=items.map(i=>'<tr><td>'+esc(labels[i.item_type]||i.item_type)+'</td><td>'+esc(i.description)+'</td><td>'+Number(i.quantity).toLocaleString('pt-BR',{maximumFractionDigits:3})+'</td><td>'+money(i.unit_price)+'</td><td>'+money(Number(i.quantity)*Number(i.unit_price))+'</td></tr>').join('');
  const html='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(code)+'</title><style>body{font-family:Arial,sans-serif;color:#162033;margin:36px}header{display:flex;justify-content:space-between;border-bottom:3px solid #162033;padding-bottom:18px;margin-bottom:24px}.brand{font-size:26px;font-weight:800}.muted{color:#667085}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 28px;margin:18px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#f4f6f8}.totals{margin-left:auto;width:320px;margin-top:18px}.totals div{display:flex;justify-content:space-between;padding:6px 0}.total{font-size:20px;font-weight:800;border-top:2px solid #222;margin-top:4px;padding-top:12px!important}.footer{margin-top:36px;font-size:12px;color:#667085}.tier{font-weight:700} @media print{button{display:none}body{margin:18mm}}</style></head><body><header><div><div class="brand">Oficina 360</div><div class="muted">Orçamento profissional de serviço</div></div><div><b>'+esc(code)+'</b><br><span class="tier">'+esc(labels[q.quote_tier]||q.quote_tier)+'</span></div></header><div class="grid"><div><b>Cliente:</b> '+esc(q.customer_name||'—')+'</div><div><b>Data:</b> '+date(q.created_at)+'</div><div><b>Veículo:</b> '+esc([v.description,v.make,v.model,v.model_year].filter(Boolean).join(' • ')||'—')+'</div><div><b>Placa:</b> '+esc(v.plate||'—')+'</div><div><b>Hodômetro:</b> '+(q.odometer_km?Number(q.odometer_km).toLocaleString('pt-BR')+' km':'—')+'</div><div><b>Validade:</b> '+date(q.valid_until)+'</div></div>'+(q.reported_issue?'<p><b>Relato:</b> '+esc(q.reported_issue)+'</p>':'')+(q.diagnosis?'<p><b>Diagnóstico:</b> '+esc(q.diagnosis)+'</p>':'')+'<table><thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>'+rows+'</tbody></table><div class="totals"><div><span>Peças</span><b>'+money(q.subtotal_parts)+'</b></div><div><span>Mão de obra</span><b>'+money(q.subtotal_labor)+'</b></div><div><span>Terceiros</span><b>'+money(q.subtotal_outsourced)+'</b></div><div><span>Desconto</span><b>- '+money(q.discount_amount)+'</b></div><div class="total"><span>Total</span><b>'+money(clientFacingTotals(q))+'</b></div></div>'+(q.payment_terms?'<p><b>Pagamento:</b> '+esc(q.payment_terms)+'</p>':'')+(q.delivery_estimate?'<p><b>Prazo:</b> '+esc(q.delivery_estimate)+'</p>':'')+(q.notes?'<p><b>Observações:</b> '+esc(q.notes)+'</p>':'')+'<div class="footer">Este documento apresenta somente os valores comerciais destinados ao cliente. Custos internos e margem não fazem parte do orçamento impresso.</div><script>window.onload=()=>window.print()<\/script></body></html>';
  w.document.open();w.document.write(html);w.document.close();
}

function shareWhatsApp(q){
  const code=quoteCode(q),v=state.vehicle||{};
  const text=['Olá'+(q.customer_name?', '+q.customer_name:'' )+'!','Segue o orçamento '+code+' da Oficina 360.',v.plate?'Veículo: '+(v.description||v.model||'Veículo')+' • '+v.plate:'',q.title||'', 'Total: '+money(q.total_amount),q.valid_until?'Validade: '+date(q.valid_until):'',q.payment_terms?'Pagamento: '+q.payment_terms:''].filter(Boolean).join('\n');
  const phone=String(q.customer_phone||'').replace(/\D/g,'');
  window.open('https://wa.me/'+(phone?(phone.startsWith('55')?phone:'55'+phone):'')+'?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');
}

window.Oficina360Quotes={
  refresh:()=>loadAll(true),
  newQuote:()=>openEditor(),
  addComponent(component){
    openEditor();setTimeout(()=>{
      const box=$('#quoteItemsEditor');if(!box)return;
      box.innerHTML=itemRow({item_type:'part',description:component?.name||component?.generic_name||'Peça',part_number:component?.oem_part_number||component?.manufacturer_part_number||'',quantity:1,unit_cost:0,unit_price:0,component_id:component?.id||null});wireRows();updateLiveTotals();
    },0);
  }
};

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
