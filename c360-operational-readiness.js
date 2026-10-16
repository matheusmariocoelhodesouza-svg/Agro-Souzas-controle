(()=>{
'use strict';
if(window.C360OperationalReadiness)return;
const state={company:null,busy:false,loadedAt:0};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function company(){try{return companyId||null}catch{return null}}
function active(){return document.querySelector('.section.active')?.id||''}
function host(){
 const root=document.getElementById('saudesistema');if(!root)return null;
 let panel=document.getElementById('c360OperationalReadiness');
 if(!panel){panel=document.createElement('div');panel.id='c360OperationalReadiness';panel.className='health-panel';root.querySelector('.health-summary')?.insertAdjacentElement('afterend',panel);if(!panel.isConnected)root.append(panel)}
 return panel;
}
async function refresh(force=false){
 const cid=company();if(!cid||state.busy||document.body.classList.contains('device-mode')||active()!=='saudesistema')return;
 if(!force&&cid===state.company&&Date.now()-state.loadedAt<60000)return;
 const panel=host();if(!panel)return;state.busy=true;state.company=cid;state.loadedAt=Date.now();
 panel.textContent='Conferindo cadastros e dependências operacionais…';
 const read=(t,q)=>restAll(t,q+'&company_id=eq.'+encodeURIComponent(cid));
 const requests=[
  read('v2_employees','select=id&status=eq.active'),
  read('v2_employee_face_enrollments','select=id,employee_id&status=eq.active&revoked_at=is.null&descriptor=not.is.null'),
  read('v2_vehicles','select=id,description,model,metadata&status=eq.active'),
  read('v2_vehicle_documents','select=id,vehicle_id,document_type,expires_at,file_id&status=eq.active'),
  read('v2_maintenance_plans','select=id,vehicle_id,next_due_at,next_due_odometer_km&active=eq.true'),
  read('v2_device_access','select=id,last_seen_at&active=eq.true'),
  rest('v2_rep_config','select=state,signing_certificate_not_after,attestation_verified_at&company_id=eq.'+cid+'&limit=1'),
  read('v2_reconcilable_costs','select=source_type,source_id,amount,cost_state,incurred_on&incurred_on=gte.'+currentMonthBR()+'-01'),
  read('v2_financial_entries','select=id,source_type,source_id,amount,entry_type,status&status=neq.cancelled')
 ];
 const results=await Promise.allSettled(requests);
 try{
  if(company()!==cid)return;
  const data=i=>results[i].status==='fulfilled'?results[i].value:null;
  const rows=[];
  if(data(0)&&data(1)){const enrolled=new Set(data(1).map(e=>e.employee_id)),pending=data(0).filter(e=>!enrolled.has(e.id)).length;rows.push(['Funcionários e biometria',pending||!data(0).length?'attention':'ok',pending+' de '+data(0).length+' ativo(s) sem biometria ativa.','funcionarios'])}
  else rows.push(['Funcionários e biometria','unknown','Não foi possível conferir os cadastros.','funcionarios']);
  if(data(2)&&data(3)){const vehicles=data(2).filter(v=>typeof isTrailerVehicle!=='function'||!isTrailerVehicle(v));const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});const pending=vehicles.filter(v=>!data(3).some(d=>d.vehicle_id===v.id&&String(d.document_type||'').toUpperCase().includes('CRLV')&&d.file_id&&(!d.expires_at||d.expires_at>=today))).length;rows.push(['Documentos da frota',pending||!vehicles.length?'attention':'ok',pending+' condução(ões) sem CRLV arquivado e válido. Confira o enquadramento de cada veículo.','frota'])}
  else rows.push(['Documentos da frota','unknown','Não foi possível conferir os documentos.','frota']);
  if(data(4)){const pending=data(4).filter(p=>!p.next_due_at&&!Number(p.next_due_odometer_km)).length;rows.push(['Programação de manutenção',pending||!data(4).length?'attention':'ok',pending+' de '+data(4).length+' registro(s) ativo(s) sem próxima data ou KM.','manutencoes'])}
  else rows.push(['Programação de manutenção','unknown','Não foi possível conferir os planos.','manutencoes']);
  if(data(5)){const stale=data(5).filter(d=>!d.last_seen_at||!Number.isFinite(Date.parse(d.last_seen_at))||Date.now()-Date.parse(d.last_seen_at)>86400000).length;rows.push(['Aparelhos de campo',stale||!data(5).length?'attention':'pending',data(5).length+' aparelho(s) vinculado(s); '+stale+' sem contato há mais de 24 h. Validar câmera, offline, reabertura e sincronização em cada aparelho.','configuracoes'])}
  else rows.push(['Aparelhos de campo','unknown','Não foi possível conferir os aparelhos.','configuracoes']);
  if(data(6)){const rep=data(6)[0],ready=rep?.state==='active'&&rep.attestation_verified_at&&Date.parse(rep.signing_certificate_not_after)>Date.now();rows.push(['Documentação do registrador de ponto',ready?'pending':'attention',ready?'Configuração presente; concluir a validação dos comprovantes e documentos.':'Configuração completa do registrador não confirmada. Os registros operacionais não comprovam a liberação do ponto oficial.','configuracoes'])}
  else rows.push(['Documentação do registrador de ponto','unknown','Acesso à configuração não confirmado. Conferir com o responsável pelo ponto.','configuracoes']);
  if(data(7)&&data(8)){const costs=data(7),entries=data(8);const pending=costs.filter(c=>!['linked','zero'].includes(classifyReconciliation(c,entries).state)).length;rows.push(['Conciliação de custos no mês',pending?'attention':'ok',pending+' de '+costs.length+' origem(ns) sem vínculo confirmado ou com dados para conferir.','financeiro'])}
  else rows.push(['Conciliação de custos no mês','unknown','Não foi possível conferir as origens financeiras.','financeiro']);
  rows.push(['IA e leitura de fotos','pending','Abra o Assistente IA para verificar a ativação e validar uma consulta e uma nota.','ia']);
  rows.push(['Impressão e rastreamento','pending','Validar PDF no celular, impressora de 80 mm e rastreamento com a tela bloqueada.','rastreamento']);
  panel.innerHTML='<div class="health-panel-head"><div><h3>Prontidão da operação</h3><div class="muted">Conferência dos dados atuais. Não substitui os testes dos aparelhos nem certifica o ponto.</div></div><button class="btn soft" type="button" data-readiness-refresh>Conferir novamente</button></div><div class="list">'+rows.map(([title,status,text,screen])=>'<div class="item"><div class="toolbar" style="justify-content:space-between"><strong>'+esc(title)+'</strong><span class="pill '+(status==='ok'?'ok':'warn')+'">'+({ok:'CONFERIDO',attention:'PENDENTE',unknown:'NÃO VERIFICADO',pending:'VALIDAR'})[status]+'</span></div><p>'+esc(text)+'</p><button class="btn soft" type="button" data-jump="'+esc(screen)+'">Abrir módulo</button></div>').join('')+'</div>';
 }finally{state.busy=false}
}
document.addEventListener('click',e=>{if(e.target.closest('[data-readiness-refresh]'))refresh(true)});
document.addEventListener('c360:screen-changed',()=>refresh());
window.C360OperationalReadiness={refresh};refresh();
})();
