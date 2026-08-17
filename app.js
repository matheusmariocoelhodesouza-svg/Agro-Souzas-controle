const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));const today=new Date().toISOString().slice(0,10),d=new Date();d.setDate(1);const ms=d.toISOString().slice(0,10);['#attDate','#maintDate','#fuelDate','#kmDate','#loadDate','#loadingReportDate'].forEach(x=>$(x).value=today);$('#repStart').value=ms;$('#repEnd').value=today;$('#earnStart').value=ms;$('#earnEnd').value=today;let sb,user,profile,employees=[],vehicles=[],equipment=[],attendance=[],maintenance=[],parts=[],fuel=[],mileage=[],documents=[],pointEvents=[],loadings=[],loadingTrucks=[],loadingSurcharges=[],tracking=[];let trackingTimer=null,trackingBusy=false;
function initClient(){sb=supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY)}
function isRecoveryUrl(){return location.hash.includes('type=recovery')||new URLSearchParams(location.search).get('type')==='recovery'}
function showResetView(){ $('#loginView').classList.add('hidden');$('#appView').classList.add('hidden');$('#resetView').classList.remove('hidden');$('#userInfo').textContent='Redefinição de senha' }
function showLoginView(message=''){ $('#resetView').classList.add('hidden');$('#appView').classList.add('hidden');$('#loginView').classList.remove('hidden');$('#userInfo').textContent='Gestão de pessoal, frota e equipamentos';if(message)$('#loginMsg').textContent=message }
async function init(){
 initClient();
 sb.auth.onAuthStateChange(async(event,session)=>{
   if(event==='PASSWORD_RECOVERY'){user=session?.user||null;showResetView();return}
   if(event==='SIGNED_OUT'){showLoginView();return}
 });
 const{data:{session}}=await sb.auth.getSession();
 if(isRecoveryUrl()){user=session?.user||null;showResetView();return}
 if(session){user=session.user;await enter()}
}
$('#loginBtn').onclick=async()=>{
 $('#loginMsg').textContent='';
 const email=$('#email').value.trim(),password=$('#password').value;
 if(!email||!password){$('#loginMsg').textContent='Informe o e-mail e a senha.';return}
 const{data,error}=await sb.auth.signInWithPassword({email,password});
 if(error){$('#loginMsg').textContent=error.message;return}
 user=data.user;await enter()
};
$('#forgotBtn').onclick=async()=>{
 const email=$('#email').value.trim();
 if(!email){$('#loginMsg').textContent='Digite seu e-mail primeiro.';return}
 $('#loginMsg').textContent='Enviando e-mail de recuperação...';
 const redirectTo=window.location.origin+'/';
 const{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo});
 if(error){$('#loginMsg').textContent=error.message;return}
 $('#loginMsg').textContent='E-mail enviado. Abra o link recebido para criar uma nova senha.'
};
$('#savePasswordBtn').onclick=async()=>{
 const p=$('#newPassword').value,c=$('#confirmPassword').value;
 $('#resetMsg').textContent='';
 if(p.length<8){$('#resetMsg').textContent='A senha precisa ter pelo menos 8 caracteres.';return}
 if(p!==c){$('#resetMsg').textContent='As duas senhas não são iguais.';return}
 const{error}=await sb.auth.updateUser({password:p});
 if(error){$('#resetMsg').textContent=error.message;return}
 $('#resetMsg').textContent='Senha alterada com sucesso.';
 await sb.auth.signOut();
 history.replaceState({},document.title,location.pathname);
 showLoginView('Senha alterada. Entre com sua nova senha.')
};
$('#cancelResetBtn').onclick=async()=>{await sb.auth.signOut();history.replaceState({},document.title,location.pathname);showLoginView()};
$('#logoutBtn').onclick=()=>sb.auth.signOut();
async function enter(){const{data,error}=await sb.from('profiles').select('*').eq('id',user.id).single();if(error){$('#loginMsg').textContent='Usuário sem perfil';return}profile=data;$('#loginView').classList.add('hidden');$('#resetView').classList.add('hidden');$('#appView').classList.remove('hidden');showTab('painel');$('#userInfo').textContent=`${profile.name} • ${profile.role}`;$$('.admin-only').forEach(x=>x.classList.toggle('hidden',profile.role!=='admin'));await refreshAll();subscribe()}
const APP_TABS=['painel','ponto2','ponto','funcionarios','frota','rastreamento','equipamentos','manutencoes','combustivel','km','carregamentos','relatorios'];
function showTab(tab){
  if(!APP_TABS.includes(tab)) tab='painel';
  APP_TABS.forEach(t=>{
    const el=$('#tab-'+t);
    if(!el)return;
    const isActive=t===tab;
    el.classList.toggle('hidden',!isActive);
    el.style.setProperty('display',isActive?'block':'none','important');
    el.setAttribute('aria-hidden',isActive?'false':'true');
  });
  $$('nav button[data-tab]').forEach(x=>{
    x.classList.toggle('active',x.dataset.tab===tab);
    x.setAttribute('aria-selected',x.dataset.tab===tab?'true':'false');
  });
  window.scrollTo({top:0,behavior:'auto'});
  if(tab==='rastreamento'){startTrackingPolling();initMovitPanel()}else stopTrackingPolling();
}
$$('nav button[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
async function refreshAll(){
 const q=await Promise.all([
  sb.from('employees').select('*').order('name'),
  sb.from('vehicles').select('*').order('name'),
  sb.from('equipment').select('*').order('name'),
  sb.from('attendance').select('*').gte('work_date',ms).lte('work_date',today),
  sb.from('maintenance').select('*').order('date',{ascending:false}),
  sb.from('maintenance_parts').select('*'),
  sb.from('fuel_logs').select('*').order('date',{ascending:false}),
  sb.from('mileage_logs').select('*').order('date',{ascending:false}),
  profile.role==='admin'?sb.from('employee_documents').select('*').order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
  sb.from('point_event_receipts').select('*').order('occurred_at',{ascending:false}).limit(30),
  sb.from('loading_summary').select('*').order('loading_date',{ascending:false}).limit(500),
  sb.from('loading_trucks').select('*').order('truck_number'),
  sb.from('loading_surcharges').select('*').order('created_at')
 ]);
 const empResult=q[0];
 if($('#empLoadMsg')){
   if(empResult.error){
     $('#empLoadMsg').innerHTML='<span class="bad" style="padding:6px 8px;border-radius:7px;display:inline-block">Erro ao carregar funcionários: '+esc(empResult.error.message)+'</span>';
   }else{
     $('#empLoadMsg').innerHTML='<span class="status-ok">'+(empResult.data||[]).length+' funcionário(s) carregado(s).</span>';
   }
 }
 [employees,vehicles,equipment,attendance,maintenance,parts,fuel,mileage,documents,pointEvents,loadings,loadingTrucks,loadingSurcharges]=q.map(x=>x.data||[]);
 fill();
 renderAll();
}
function active(a){return a.filter(x=>x.active!==false)}function fill(){const teams=[...new Set(active(employees).map(e=>e.team).filter(Boolean))].sort();$('#attTeam').innerHTML='<option value="">Todas</option>'+teams.map(t=>`<option>${esc(t)}</option>`).join('');const eo=active(employees).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');$('#docEmp').innerHTML=eo;$('#faceEmp').innerHTML=eo;$('#kmDriver').innerHTML='<option value="">Não informado</option>'+eo;const vo=active(vehicles).map(v=>`<option value="${v.id}">${esc(v.name)}${v.plate?' — '+esc(v.plate):''}</option>`).join('');$('#fuelVehicle').innerHTML=vo;$('#kmVehicle').innerHTML=vo;$('#repVehicle').innerHTML='<option value="">Todas</option>'+vo;fillMaint()}function fillMaint(){const a=$('#maintAssetType').value==='vehicle'?active(vehicles):active(equipment);$('#maintAsset').innerHTML=a.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}$('#maintAssetType').onchange=fillMaint;

let editingEmployeeId=null;
function clearEmployeeForm(){
 editingEmployeeId=null;
 $('#empName').value='';
 $('#empMat').value='';
 $('#empTeam').value='';
 $('#empRate').value='';
 $('#saveEmp').textContent='Salvar';
 $('#cancelEmpEdit').classList.add('hidden');
 $('#empMsg').textContent='';
}
function friendlyEmployeeError(error){
 const msg=(error?.message||String(error||''));
 if(msg.includes('employees_registration_unique')||msg.toLowerCase().includes('duplicate key')){
   return 'Esta matrícula já está cadastrada para outro funcionário. Use uma matrícula diferente ou edite/exclua o cadastro existente.';
 }
 return msg;
}
$('#saveEmp').onclick=async()=>{
 const name=$('#empName').value.trim();
 const registration=$('#empMat').value.trim()||null;
 const team=$('#empTeam').value.trim()||null;
 const daily_rate=Number($('#empRate').value)||0;
 if(!name)return alert('Informe o nome');
 $('#empMsg').textContent=editingEmployeeId?'Atualizando funcionário...':'Salvando funcionário...';
 let result;
 if(editingEmployeeId){
   result=await sb.from('employees').update({name,registration,team,daily_rate}).eq('id',editingEmployeeId);
 }else{
   result=await sb.from('employees').insert({name,registration,team,daily_rate,active:true});
 }
 if(result.error){
   $('#empMsg').textContent=friendlyEmployeeError(result.error);
   return;
 }
 $('#empMsg').innerHTML='<span class="status-ok">'+(editingEmployeeId?'Funcionário atualizado.':'Funcionário cadastrado.')+'</span>';
 clearEmployeeForm();
 await refreshAll();
};
$('#cancelEmpEdit').onclick=clearEmployeeForm;
window.editEmployee=(id)=>{
 const e=employees.find(x=>x.id===id);
 if(!e)return;
 editingEmployeeId=id;
 $('#empName').value=e.name||'';
 $('#empMat').value=e.registration||'';
 $('#empTeam').value=e.team||'';
 $('#empRate').value=Number(e.daily_rate||0);
 $('#saveEmp').textContent='Atualizar';
 $('#cancelEmpEdit').classList.remove('hidden');
 $('#empMsg').textContent='Editando '+e.name;
 document.getElementById('empName')?.scrollIntoView({behavior:'smooth',block:'center'});
};
window.deleteEmployee=async(id)=>{
 const e=employees.find(x=>x.id===id);
 if(!e)return;
 if(!confirm(`Excluir ${e.name}?`))return;

 // Preserve labor-history records. Hard-delete only when there is no point/attendance history.
 const [p,a]=await Promise.all([
   sb.from('point_events').select('id',{count:'exact',head:true}).eq('employee_id',id),
   sb.from('attendance').select('id',{count:'exact',head:true}).eq('employee_id',id)
 ]);
 const hasHistory=(Number(p.count||0)+Number(a.count||0))>0;

 if(hasHistory){
   const{error}=await sb.from('employees').update({active:false}).eq('id',id);
   if(error)return alert(friendlyEmployeeError(error));
   alert('Este funcionário possui histórico. Por segurança, ele foi desativado e os registros foram preservados.');
 }else{
   const{error}=await sb.from('employees').delete().eq('id',id);
   if(error){
     const fallback=await sb.from('employees').update({active:false}).eq('id',id);
     if(fallback.error)return alert(friendlyEmployeeError(error));
     alert('O cadastro possui vínculos e foi desativado para preservar o histórico.');
   }else{
     alert('Funcionário excluído. A matrícula ficou disponível novamente.');
   }
 }
 if(editingEmployeeId===id)clearEmployeeForm();
 await refreshAll();
};
$('#saveVehicle').onclick=async()=>{const{error}=await sb.from('vehicles').insert({name:$('#vehName').value.trim(),plate:$('#vehPlate').value.trim().toUpperCase()||null,model:$('#vehModel').value||null,year:Number($('#vehYear').value)||null,current_km:Number($('#vehKm').value)||0,renavam:$('#vehRenavam').value||null,license_due:$('#vehLicense').value||null,active:true});if(error)alert(error.message);else refreshAll()};$('#saveEquipment').onclick=async()=>{const{error}=await sb.from('equipment').insert({name:$('#eqName').value.trim(),serial_number:$('#eqSerial').value||null,team:$('#eqTeam').value||null,purchase_date:$('#eqPurchase').value||null,meter_unit:$('#eqMeterUnit').value,current_meter:Number($('#eqMeter').value)||0,active:true});if(error)alert(error.message);else refreshAll()};
function rec(date,id){return attendance.find(r=>r.work_date===date&&r.employee_id===id)}window.setAttendance=async(id,status)=>{const o=rec($('#attDate').value,id)||{};const{error}=await sb.from('attendance').upsert({employee_id:id,work_date:$('#attDate').value,status,extra:o.extra||0,discount:o.discount||0,note:o.note||'',recorded_by:user.id},{onConflict:'employee_id,work_date'});if(error)alert(error.message);else refreshAll()};
$('#saveMaint').onclick=async()=>{const{data,error}=await sb.from('maintenance').insert({asset_type:$('#maintAssetType').value,asset_id:$('#maintAsset').value,date:$('#maintDate').value,type:$('#maintType').value,meter:Number($('#maintMeter').value)||null,labor_cost:Number($('#maintLabor').value)||0,next_date:$('#maintNextDate').value||null,next_meter:Number($('#maintNextMeter').value)||null,notes:$('#maintNotes').value||null,created_by:user.id}).select().single();if(error)return alert(error.message);if($('#partName').value||Number($('#partValue').value)){const e=await sb.from('maintenance_parts').insert({maintenance_id:data.id,part_name:$('#partName').value||'Peça',quantity:Number($('#partQty').value)||1,unit_value:Number($('#partValue').value)||0});if(e.error)return alert(e.error.message)}refreshAll()};$('#saveFuel').onclick=async()=>{const{error}=await sb.from('fuel_logs').insert({vehicle_id:$('#fuelVehicle').value,date:$('#fuelDate').value,odometer_km:Number($('#fuelKm').value),liters:Number($('#fuelLiters').value),total_value:Number($('#fuelTotal').value),station:$('#fuelStation').value||null,created_by:user.id});if(error)alert(error.message);else refreshAll()};$('#saveKm').onclick=async()=>{const s=Number($('#kmStart').value),e=Number($('#kmEnd').value);if(e<s)return alert('KM final menor que o inicial');const{error}=await sb.from('mileage_logs').insert({vehicle_id:$('#kmVehicle').value,date:$('#kmDate').value,start_km:s,end_km:e,driver_employee_id:$('#kmDriver').value||null,route_or_purpose:$('#kmPurpose').value||null,created_by:user.id});if(error)alert(error.message);else refreshAll()};


function gpsPosition(){
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation)return reject(new Error('Geolocalização não disponível'));
  navigator.geolocation.getCurrentPosition(
   resolve,
   ()=>{
    navigator.geolocation.getCurrentPosition(
     resolve,
     e=>reject(new Error(e.message||'Não foi possível obter a localização')),
     {enableHighAccuracy:false,timeout:20000,maximumAge:60000}
    );
   },
   {enableHighAccuracy:true,timeout:10000,maximumAge:30000}
  );
 });
}
function fileExt(f){return (f.type||'').includes('png')?'png':'jpg'}
async function uploadBiometricPhoto(file,path){const{error}=await sb.storage.from('biometric-selfies').upload(path,file,{contentType:file.type||'image/jpeg',upsert:false});if(error)throw error;return path}
const FACE_MODELS='https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';
let faceModelsReady=false;
async function ensureFaceModels(){
 if(faceModelsReady)return;
 if(!window.faceapi)throw new Error('Reconhecimento facial ainda carregando. Aguarde alguns segundos e tente novamente.');
 $('#punchStatus').textContent='Carregando reconhecimento facial...';
 await Promise.all([
   faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODELS),
   faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODELS),
   faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODELS)
 ]);
 faceModelsReady=true;
}
async function imageFromFile(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=()=>{URL.revokeObjectURL(u);reject(new Error('Não foi possível abrir a foto'))};im.src=u})}
async function faceDescriptorFromFile(file){
 await ensureFaceModels();
 const img=await imageFromFile(file);
 const r=await faceapi.detectSingleFace(img,new faceapi.TinyFaceDetectorOptions({inputSize:320,scoreThreshold:.55})).withFaceLandmarks().withFaceDescriptor();
 if(!r)throw new Error('Rosto não identificado. Tire outra foto de frente e com boa iluminação.');
 return Array.from(r.descriptor);
}
function renderPointReceipt(r,method,pos,distance){
 const when=new Date(r.occurred_at).toLocaleString('pt-BR');
 $('#punchReceipt').innerHTML=`<strong>✅ Ponto registrado</strong><br><b>${esc(r.employee_name)}</b><br>Método: <b>${method}</b><br>Horário: ${esc(when)}<br>GPS: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}<br>Precisão: ${Math.round(pos.coords.accuracy||0)} m${distance!=null?`<br>Validação facial aprovada (${Number(distance).toFixed(3)})`:''}<br>Código: <b>${esc(r.proof_code)}</b><div id="pointVehicleValidation" class="note" style="margin-top:8px">Verificando condução próxima...</div>`;
 $('#punchReceipt').classList.remove('hidden');
 const eventId=r.point_event_id||r.event_id; if(eventId)validatePointVehicle(eventId);
}
$('#enrollFaceBtn').onclick=async()=>{
 if(profile.role!=='admin')return alert('Somente administrador pode cadastrar biometria facial');
 const employee_id=$('#faceEmp').value,f=$('#facePhoto').files[0];
 if(!employee_id)return alert('Selecione o funcionário');
 if(!f)return alert('Tire uma foto do rosto');
 $('#faceMsg').textContent='Processando rosto...';
 try{
   const descriptor=await faceDescriptorFromFile(f);
   const path=`enrollments/${employee_id}/${Date.now()}-${crypto.randomUUID()}.${fileExt(f)}`;
   await uploadBiometricPhoto(f,path);
   let x=await sb.rpc('enroll_employee_face',{p_employee_id:employee_id,p_photo_storage_path:path});if(x.error)throw x.error;
   x=await sb.rpc('save_employee_face_descriptor',{p_employee_id:employee_id,p_descriptor:descriptor});if(x.error)throw x.error;
   $('#faceMsg').innerHTML='<span class="status-ok">Face cadastrada para reconhecimento automático.</span>';
   $('#facePhoto').value='';
   await refreshAll();
 }catch(e){$('#faceMsg').textContent=e.message||String(e)}
};
$('#matriculaPunchBtn').onclick=async()=>{
 const reg=$('#punchRegistration').value.trim();
 if(!reg)return alert('Informe a matrícula');
 $('#punchStatus').textContent='Obtendo GPS...';
 $('#punchReceipt').classList.add('hidden');
 try{
   const pos=await gpsPosition();
   const{data,error}=await sb.rpc('register_point_event_by_registration',{p_registration:reg,p_latitude:pos.coords.latitude,p_longitude:pos.coords.longitude,p_accuracy_m:Math.round(pos.coords.accuracy||0),p_selfie_storage_path:null,p_device_id:null});
   if(error)throw error;
   const r=(data||[])[0];
   if(!r)throw new Error('Comprovante não gerado');
   renderPointReceipt(r,'MATRÍCULA',pos,null);
   $('#punchRegistration').value='';
   $('#punchStatus').textContent='';
   await refreshAll();
 }catch(e){$('#punchStatus').textContent=e.message||String(e)}
};
async function captureFacePhoto(){
 if(!navigator.mediaDevices?.getUserMedia)throw new Error('Câmera não disponível neste dispositivo');
 const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
 return await new Promise((resolve,reject)=>{
  const wrap=document.createElement('div');
  wrap.style.cssText='position:fixed;inset:0;background:#000d;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  const box=document.createElement('div');
  box.style.cssText='background:#fff;border-radius:18px;padding:14px;width:min(420px,100%);';
  const video=document.createElement('video');
  video.autoplay=true;video.playsInline=true;video.srcObject=stream;
  video.style.cssText='width:100%;border-radius:14px;background:#000;max-height:70vh;object-fit:cover';
  const msg=document.createElement('div');
  msg.textContent='Posicione o rosto de frente e toque em Capturar';
  msg.style.cssText='padding:10px 0;font-weight:700';
  const actions=document.createElement('div');
  actions.style.cssText='display:flex;gap:10px';
  const capture=document.createElement('button');
  capture.className='btn primary';capture.textContent='Capturar';
  const cancel=document.createElement('button');
  cancel.className='btn soft';cancel.textContent='Cancelar';
  actions.append(capture,cancel);box.append(video,msg,actions);wrap.append(box);document.body.append(wrap);

  const stop=()=>{stream.getTracks().forEach(t=>t.stop());wrap.remove()};
  cancel.onclick=()=>{stop();reject(new Error('Captura cancelada'))};
  capture.onclick=()=>{
   try{
    const canvas=document.createElement('canvas');
    canvas.width=video.videoWidth||720;canvas.height=video.videoHeight||960;
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    canvas.toBlob(blob=>{
     if(!blob){stop();return reject(new Error('Não foi possível capturar a foto'))}
     const file=new File([blob],`facial-${Date.now()}.jpg`,{type:'image/jpeg'});
     stop();resolve(file);
    },'image/jpeg',0.92);
   }catch(e){stop();reject(e)}
  };
 });
}

$('#facialPunchBtn').onclick=async()=>{
 $('#punchStatus').textContent='Abrindo câmera...';
 $('#punchReceipt').classList.add('hidden');
 try{
   const f=await captureFacePhoto();
   $('#punchStatus').textContent='Analisando rosto...';
   const descriptor=await faceDescriptorFromFile(f);
   const{data:match,error:me}=await sb.rpc('match_employee_face',{p_descriptor:descriptor,p_threshold:.50});
   if(me)throw me;
   const m=(match||[])[0];
   if(!m)throw new Error('Rosto não reconhecido ou ainda não cadastrado');
   $('#punchStatus').textContent=`${m.employee_name} reconhecido. Obtendo GPS...`;
   const pos=await gpsPosition();
   const path=`punches/${m.employee_id}/${Date.now()}-${crypto.randomUUID()}.${fileExt(f)}`;
   await uploadBiometricPhoto(f,path);
   const score=Math.max(0,1-Number(m.distance||0));
   const{data,error}=await sb.rpc('register_point_event_by_employee',{p_employee_id:m.employee_id,p_latitude:pos.coords.latitude,p_longitude:pos.coords.longitude,p_accuracy_m:Math.round(pos.coords.accuracy||0),p_selfie_storage_path:path,p_face_score:score,p_device_id:null});
   if(error)throw error;
   const r=(data||[])[0];
   if(!r)throw new Error('Comprovante não gerado');
   renderPointReceipt(r,'FACIAL',pos,m.distance);
   $('#punchStatus').textContent='';
   await refreshAll();
 }catch(e){
   $('#punchStatus').textContent=(e.message||'')==='Captura cancelada'?'':(e.message||String(e));
 }
};
$('#uploadDoc').onclick=async()=>{const f=$('#docFile').files[0],employee_id=$('#docEmp').value;if(!f)return alert('Selecione um arquivo');const path=`${employee_id}/${crypto.randomUUID()}.${(f.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'')}`;const up=await sb.storage.from('employee-documents').upload(path,f);if(up.error)return alert(up.error.message);const ins=await sb.from('employee_documents').insert({employee_id,doc_type:$('#docType').value,storage_path:path,file_name:f.name,uploaded_by:user.id});if(ins.error)alert(ins.error.message);else refreshAll()};window.openDoc=async p=>{const{data,error}=await sb.storage.from('employee-documents').createSignedUrl(p,60);if(error)alert(error.message);else window.open(data.signedUrl,'_blank')};

function renderTruckInputs(){
 const n=Math.max(1,Math.min(50,Number($('#loadTruckCount').value)||1));
 const old=[...document.querySelectorAll('.truck-card')].map(c=>({
   plate:c.querySelector('.lt-plate')?.value||'',
   driver:c.querySelector('.lt-driver')?.value||'',
   birds:c.querySelector('.lt-birds')?.value||'',
   notes:c.querySelector('.lt-notes')?.value||''
 }));
 $('#loadTruckCount').value=n;
 $('#loadTrucks').innerHTML=Array.from({length:n},(_,i)=>{
   const v=old[i]||{};
   return `<div class="truck-card"><h3>Caminhão ${i+1}</h3><div class="grid">
   <div><label>Placa</label><input class="lt-plate" value="${esc(v.plate)}" placeholder="ABC1D23"></div>
   <div><label>Motorista</label><input class="lt-driver" value="${esc(v.driver)}" placeholder="Nome do motorista"></div>
   <div><label>Quantidade de aves</label><input class="lt-birds" type="number" min="0" value="${esc(v.birds)}" placeholder="0"></div>
   <div><label>Observação do caminhão</label><input class="lt-notes" value="${esc(v.notes)}" placeholder="Opcional"></div>
   </div></div>`;
 }).join('');
}
$('#loadTruckCount').onchange=renderTruckInputs;
$('#loadTruckCount').oninput=()=>{clearTimeout(window.__truckTimer);window.__truckTimer=setTimeout(renderTruckInputs,250)};
renderTruckInputs();

function addSurchargeCard(values={}){
 const wrap=document.createElement('div');
 wrap.className='surcharge-card';
 wrap.innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h3>Acréscimo</h3><button class="btn bad surcharge-remove" type="button">Remover</button></div>
 <div class="grid">
 <div><label>Motivo</label><select class="ls-type">
   <option value="tempo_parado">Tempo parado</option>
   <option value="barro">Barro</option>
   <option value="cata">Cata</option>
   <option value="outro">Outro</option>
 </select></div>
 <div><label>Quantidade</label><input class="ls-qty" type="number" step=".01" placeholder="Ex.: 2"></div>
 <div><label>Unidade</label><select class="ls-unit"><option value="">Não informado</option><option value="horas">Horas</option><option value="aves">Aves</option><option value="viagens">Viagens</option><option value="percentual">Percentual</option><option value="outro">Outro</option></select></div>
 <div><label>Valor do acréscimo (R$)</label><input class="ls-amount" type="number" step=".01" min="0" placeholder="0,00"></div>
 <div><label>Percentual (%)</label><input class="ls-percent" type="number" step=".01" min="0" placeholder="Opcional"></div>
 </div>
 <label>Por que houve o acréscimo?</label><textarea class="ls-desc" placeholder="Descreva o motivo com detalhes"></textarea>`;
 wrap.querySelector('.ls-type').value=values.surcharge_type||'tempo_parado';
 wrap.querySelector('.ls-qty').value=values.quantity||'';
 wrap.querySelector('.ls-unit').value=values.unit||'';
 wrap.querySelector('.ls-amount').value=values.amount||'';
 wrap.querySelector('.ls-percent').value=values.percentage||'';
 wrap.querySelector('.ls-desc').value=values.description||'';
 wrap.querySelector('.surcharge-remove').onclick=()=>wrap.remove();
 $('#loadSurcharges').appendChild(wrap);
}
$('#addSurcharge').onclick=()=>addSurchargeCard();

function clearLoadingForm(){
 $('#loadDate').value=today;
 $('#loadIntegrated').value='';
 $('#loadCity').value='';
 $('#loadVoltage').value='220V';
 $('#loadOutlet').selectedIndex=0;
 $('#loadTruckCount').value=1;
 $('#loadNotes').value='';
 $('#loadSurcharges').innerHTML='';
 renderTruckInputs();
}
$('#saveLoading').onclick=async()=>{
 const integrated=$('#loadIntegrated').value.trim(),city=$('#loadCity').value.trim();
 if(!integrated)return alert('Informe o nome do integrado');
 if(!city)return alert('Informe a cidade');
 const trucks=[...document.querySelectorAll('.truck-card')].map((c,i)=>({
   truck_number:i+1,
   plate:c.querySelector('.lt-plate').value.trim(),
   driver_name:c.querySelector('.lt-driver').value.trim(),
   bird_count:Number(c.querySelector('.lt-birds').value)||0,
   notes:c.querySelector('.lt-notes').value.trim()||null
 }));
 for(const [i,t] of trucks.entries()){
   if(!t.plate)return alert(`Informe a placa do caminhão ${i+1}`);
   if(!t.driver_name)return alert(`Informe o motorista do caminhão ${i+1}`);
 }
 const surcharges=[...document.querySelectorAll('.surcharge-card')].map(c=>({
   surcharge_type:c.querySelector('.ls-type').value,
   quantity:c.querySelector('.ls-qty').value||null,
   unit:c.querySelector('.ls-unit').value||null,
   amount:Number(c.querySelector('.ls-amount').value)||0,
   percentage:c.querySelector('.ls-percent').value||null,
   description:c.querySelector('.ls-desc').value.trim()||null
 }));
 $('#loadingMsg').textContent='Salvando carregamento...';
 const{data,error}=await sb.rpc('save_loading',{
   p_loading_date:$('#loadDate').value,
   p_integrated_name:integrated,
   p_city:city,
   p_voltage:$('#loadVoltage').value,
   p_outlet_type:$('#loadOutlet').value,
   p_notes:$('#loadNotes').value.trim()||null,
   p_trucks:trucks,
   p_surcharges:surcharges
 });
 if(error){$('#loadingMsg').textContent=error.message;return}
 $('#loadingMsg').innerHTML='<span class="status-ok">Carregamento salvo com sucesso.</span>';
 clearLoadingForm();
 await refreshAll();
};

function loadingDetailRows(l){
 const ts=loadingTrucks.filter(t=>t.loading_id===l.id);
 const ss=loadingSurcharges.filter(s=>s.loading_id===l.id);
 return {ts,ss};
}
function surchargeLabel(t){return ({tempo_parado:'Tempo parado',barro:'Barro',cata:'Cata',outro:'Outro'})[t]||t}
function renderLoadingHistory(){
 if(!$('#loadingHistory'))return;
 $('#loadingHistory').innerHTML=`<div class=tablewrap><table><tr><th>Data</th><th>Integrado</th><th>Cidade</th><th>Energia</th><th>Tomada</th><th>Caminhões</th><th>Aves</th><th>Acréscimos</th><th>Observações</th></tr>${loadings.slice(0,100).map(l=>`<tr><td>${l.loading_date}</td><td>${esc(l.integrated_name)}</td><td>${esc(l.city)}</td><td>${esc(l.voltage)}</td><td>${esc(l.outlet_type)}</td><td>${l.registered_trucks}</td><td>${Number(l.total_birds||0).toLocaleString('pt-BR')}</td><td>${money(l.total_surcharge)}</td><td>${esc(l.notes)}</td></tr>`).join('')}</table></div>`;
}
function reportRange(type,ref){
 const d=new Date(ref+'T12:00:00');
 if(type==='daily')return [ref,ref];
 if(type==='weekly'){
   const day=d.getDay()||7;
   const a=new Date(d);a.setDate(d.getDate()-day+1);
   const b=new Date(a);b.setDate(a.getDate()+6);
   return [a.toISOString().slice(0,10),b.toISOString().slice(0,10)];
 }
 const a=new Date(d.getFullYear(),d.getMonth(),1);
 const b=new Date(d.getFullYear(),d.getMonth()+1,0);
 return [a.toISOString().slice(0,10),b.toISOString().slice(0,10)];
}
function getLoadingReportRows(){
 const type=$('#loadingReportType').value,ref=$('#loadingReportDate').value||today;
 const [a,b]=reportRange(type,ref);
 const integ=$('#loadingReportIntegrated').value.trim().toLowerCase();
 const city=$('#loadingReportCity').value.trim().toLowerCase();
 return loadings.filter(l=>l.loading_date>=a&&l.loading_date<=b&&(!integ||String(l.integrated_name).toLowerCase().includes(integ))&&(!city||String(l.city).toLowerCase().includes(city)));
}
function renderLoadingReport(){
 if(!$('#loadingReportTable'))return;
 const rows=getLoadingReportRows();
 $('#loadRepLoads').textContent=rows.length.toLocaleString('pt-BR');
 $('#loadRepTrucks').textContent=rows.reduce((a,r)=>a+Number(r.registered_trucks||0),0).toLocaleString('pt-BR');
 $('#loadRepBirds').textContent=rows.reduce((a,r)=>a+Number(r.total_birds||0),0).toLocaleString('pt-BR');
 $('#loadRepSurcharge').textContent=money(rows.reduce((a,r)=>a+Number(r.total_surcharge||0),0));
 $('#loadingReportTable').innerHTML=`<div class=tablewrap><table><tr><th>Data</th><th>Integrado</th><th>Cidade</th><th>Caminhões</th><th>Aves</th><th>Acréscimos</th><th>Motivos</th><th>Observações</th></tr>${rows.map(l=>{const {ss}=loadingDetailRows(l);const motivos=ss.map(s=>`${surchargeLabel(s.surcharge_type)}${s.description?' — '+s.description:''}${Number(s.amount||0)>0?' ('+money(s.amount)+')':''}`).join(' | ');return `<tr><td>${l.loading_date}</td><td>${esc(l.integrated_name)}</td><td>${esc(l.city)}</td><td>${l.registered_trucks}</td><td>${Number(l.total_birds||0).toLocaleString('pt-BR')}</td><td>${money(l.total_surcharge)}</td><td>${esc(motivos)}</td><td>${esc(l.notes)}</td></tr>`}).join('')}</table></div>`;
 return rows;
}
$('#refreshLoadingReport').onclick=renderLoadingReport;
$('#loadingReportType').onchange=renderLoadingReport;
$('#loadingReportDate').onchange=renderLoadingReport;
$('#loadingReportIntegrated').oninput=renderLoadingReport;
$('#loadingReportCity').oninput=renderLoadingReport;
$('#exportLoadingReport').onclick=()=>{
 const rows=getLoadingReportRows();
 const data=[['Data','Integrado','Cidade','Energia','Tomada','Caminhoes','Aves','Acrescimos','Motivos','Observacoes']];
 rows.forEach(l=>{const{ss}=loadingDetailRows(l);const motivos=ss.map(s=>`${surchargeLabel(s.surcharge_type)}${s.description?' - '+s.description:''}`).join(' | ');data.push([l.loading_date,l.integrated_name,l.city,l.voltage,l.outlet_type,l.registered_trucks,l.total_birds,l.total_surcharge,motivos,l.notes||''])});
 const csv=data.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n');
 const b=new Blob(['\ufeff'+csv],{type:'text/csv'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=`relatorio_carregamentos_${$('#loadingReportType').value}_${$('#loadingReportDate').value}.csv`;a.click();URL.revokeObjectURL(u);
};


async function movitStatus(){
 if(profile?.role!=='admin')return null;
 const data=await callMovitBridge({action:'status'});
 const el=$('#movitConfigStatus');
 if(el){
  if(data?.configured){
   el.innerHTML=`<span class="status-ok">✓ Backend MOVIT configurado e criptografado</span>${data.clientKey?` • cliente: ${esc(data.clientKey)}`:''}${data.userId?` • userId: ${esc(data.userId)}`:''}`;
  }else{
   el.innerHTML='<span class="status-warn">MOVIT ainda não configurado. Preencha os dados abaixo uma única vez.</span>';
   $('#movitConfigDetails')?.setAttribute('open','');
  }
 }
 return data;
}
function parseOptionalJson(id,label){
 const raw=$(id)?.value?.trim();
 if(!raw)return null;
 try{return JSON.parse(raw)}catch(_){throw new Error(`${label}: JSON inválido`)}
}
async function saveMovitConfiguration(){
 const status=$('#movitConfigStatus');
 const btn=$('#saveMovitConfig');
 try{
  const password=$('#movitPassword').value;
  if(!password)throw new Error('Digite a senha do MOVIT. Ela será enviada somente ao backend seguro.');
  btn.disabled=true;
  status.textContent='Testando login e consulta dos rastreadores...';
  const data=await callMovitBridge({
   action:'configure',
   clientKey:$('#movitClientKey').value.trim(),
   userId:Number($('#movitUserId').value),
   username:$('#movitUsername').value.trim(),
   password,
   locale:'pt',
   loginUserField:$('#movitLoginUserField').value.trim()||'user',
   loginPasswordField:$('#movitLoginPasswordField').value.trim()||'password',
   loginTemplate:parseOptionalJson('#movitLoginTemplate','Payload de login'),
   gridTemplate:parseOptionalJson('#movitGridTemplate','Payload da grade')
  });
  $('#movitPassword').value='';
  status.innerHTML=`<span class="status-ok">✓ ${esc(data.message||'MOVIT configurado com sucesso.')}</span>`;
  await refreshTracking(false);
 }catch(e){
  status.innerHTML=`<span class="status-warn">${esc(e.message||String(e))}</span>`;
 }finally{btn.disabled=false}
}
async function initMovitPanel(){
 if(profile?.role!=='admin')return;
 try{
  const st=await movitStatus();
  if(st?.configured)await refreshTracking(true);
  else {tracking=[];renderTracking();if($('#trackingStatus'))$('#trackingStatus').textContent='Configure o MOVIT abaixo para ativar o rastreamento.'}
 }catch(e){if($('#movitConfigStatus'))$('#movitConfigStatus').innerHTML=`<span class="status-warn">${esc(e.message||String(e))}</span>`}
}
if($('#saveMovitConfig'))$('#saveMovitConfig').onclick=saveMovitConfiguration;
if($('#checkMovitConfig'))$('#checkMovitConfig').onclick=async()=>{try{await movitStatus();await refreshTracking(false)}catch(e){if($('#movitConfigStatus'))$('#movitConfigStatus').innerHTML=`<span class="status-warn">${esc(e.message||String(e))}</span>`}};

async function callMovitBridge(payload){
 const{data,error}=await sb.functions.invoke('movit-bridge',{body:payload});
 if(error){
  const ctx=error.context; let msg=error.message||'Falha na integração MOVIT';
  try{const j=ctx&&await ctx.json();if(j?.message)msg=j.message;if(j?.error==='MOVIT_NOT_CONFIGURED')msg='Integração MOVIT ainda não configurada no servidor.'}catch(_){}
  throw new Error(msg);
 }
 if(data?.error)throw new Error(data.message||data.error);
 return data;
}
function trackingAge(v){
 if(!v?.gps_at)return {text:'Sem horário GPS',stale:true};
 const ms=Date.now()-new Date(v.gps_at).getTime();
 if(!Number.isFinite(ms))return {text:'Horário inválido',stale:true};
 const min=Math.max(0,Math.round(ms/60000));
 return {text:min<1?'agora':min===1?'há 1 min':`há ${min} min`,stale:min>15};
}
function renderTracking(){
 if(!$('#trackingTable'))return;
 $('#trackingTotal').textContent=tracking.length;
 $('#trackingMoving').textContent=tracking.filter(v=>Number(v.speed_kmh||0)>2).length;
 $('#trackingIgnition').textContent=tracking.filter(v=>v.ignition===true).length;
 $('#trackingLinked').textContent=tracking.filter(v=>v.vehicle_id).length;
 if(!tracking.length){$('#trackingTable').innerHTML='<div class="note">Nenhuma condução recebida do MOVIT.</div>';return}
 $('#trackingTable').innerHTML=`<div class=tablewrap><table><tr><th>Condução</th><th>Placa</th><th>Status</th><th>Velocidade</th><th>Último GPS</th><th>Localização</th><th>Endereço</th></tr>${tracking.map(v=>{const a=trackingAge(v),lat=Number(v.latitude),lon=Number(v.longitude),hasPos=Number.isFinite(lat)&&Number.isFinite(lon),status=a.stale?'<span class="tracking-badge tracking-stale">GPS antigo</span>':v.ignition===true?'<span class="tracking-badge tracking-on">Ligada</span>':'<span class="tracking-badge tracking-off">Desligada</span>',name=v.vehicle_name||vehicles.find(x=>x.id===v.vehicle_id)?.name||'Não vinculada',map=hasPos?`<a class="tracking-link" target="_blank" rel="noopener" href="https://www.google.com/maps?q=${lat},${lon}">Abrir mapa</a><br><span class="tracking-muted">${lat.toFixed(5)}, ${lon.toFixed(5)}</span>`:'—';return `<tr><td>${esc(name)}</td><td><b>${esc(v.license_plate)}</b></td><td>${status}</td><td>${Number(v.speed_kmh||0).toFixed(0)} km/h</td><td>${esc(a.text)}</td><td>${map}</td><td>${esc(v.address||'—')}</td></tr>`}).join('')}</table></div>`;
}
async function refreshTracking(silent=false){
 if(profile?.role!=='admin'||trackingBusy)return;
 trackingBusy=true;
 if(!silent&&$('#trackingStatus'))$('#trackingStatus').textContent='Atualizando posições no MOVIT...';
 try{
  const data=await callMovitBridge({action:'sync'});
  tracking=data?.vehicles||[];renderTracking();
  if($('#trackingStatus'))$('#trackingStatus').innerHTML=`<span class="status-ok">✓ ${tracking.length} rastreador(es) atualizado(s)</span> • ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})} • atualização automática a cada 30 s enquanto esta tela estiver aberta.`;
 }catch(e){if($('#trackingStatus'))$('#trackingStatus').innerHTML=`<span class="status-warn">${esc(e.message||String(e))}</span>`}
 finally{trackingBusy=false}
}
function startTrackingPolling(){if(profile?.role!=='admin')return;if(!trackingTimer)trackingTimer=setInterval(()=>refreshTracking(true),30000)}
function stopTrackingPolling(){if(trackingTimer){clearInterval(trackingTimer);trackingTimer=null}}
if($('#refreshTracking'))$('#refreshTracking').onclick=()=>refreshTracking(false);
async function validatePointVehicle(eventId){
 const el=$('#pointVehicleValidation');if(!el)return;
 try{
  const v=await callMovitBridge({action:'validate_point',event_id:eventId});
  if(v.status==='matched')el.innerHTML=`<span class="status-ok">✓ Local confirmado pela condução ${esc(v.vehicle?.plate||'')} • ${Number(v.distanceM||0).toLocaleString('pt-BR')} m</span>`;
  else if(v.status==='too_far')el.innerHTML=`<span class="status-warn">⚠ Ponto registrado, mas a condução mais próxima estava a ${Number(v.distanceM||0).toLocaleString('pt-BR')} m.</span>`;
  else if(v.status==='stale')el.innerHTML='<span class="status-warn">⚠ Ponto registrado. A posição do rastreador estava desatualizada e não foi usada para confirmar o local.</span>';
  else el.textContent='Ponto registrado. Não foi possível confirmar a condução neste momento.';
 }catch(e){el.textContent='Ponto registrado. Validação da condução indisponível no momento.'}
}

function pc(id){return parts.filter(p=>p.maintenance_id===id).reduce((s,p)=>s+Number(p.quantity)*Number(p.unit_value),0)}function an(m){const a=m.asset_type==='vehicle'?vehicles.find(x=>x.id===m.asset_id):equipment.find(x=>x.id===m.asset_id);return a?.name||'-'}function renderAll(){renderEmployees();renderVehicles();renderEquipment();renderAttendance();renderMaint();renderFuel();renderKm();renderDocs();renderDashboard();renderRecentPoints();renderLoadingHistory();renderLoadingReport();calcEarnings();calcReport()}function renderEmployees(){$('#empTable').innerHTML=`<div class=tablewrap><table><tr><th>Nome</th><th>Matrícula</th><th>Equipe</th><th>Diária</th><th>Biometria</th><th>Status</th><th>Ações</th></tr>${employees.map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.registration)}</td><td>${esc(e.team)}</td><td>${money(e.daily_rate)}</td><td>${e.biometric_enabled?'✅ Cadastrada':'—'}</td><td>${e.active===false?'Inativo':'Ativo'}</td><td>${profile.role==='admin'?`<button class="btn soft" onclick="editEmployee('${e.id}')">Editar</button> <button class="btn bad" onclick="deleteEmployee('${e.id}')">Excluir</button>`:''}</td></tr>`).join('')}</table></div>`}function renderVehicles(){$('#vehicleTable').innerHTML=`<div class=tablewrap><table><tr><th>Condução</th><th>Placa</th><th>Modelo</th><th>KM</th><th>Licenciamento</th></tr>${vehicles.map(v=>`<tr><td>${esc(v.name)}</td><td>${esc(v.plate)}</td><td>${esc(v.model)}</td><td>${Number(v.current_km||0).toLocaleString('pt-BR')}</td><td>${v.license_due||''}</td></tr>`).join('')}</table></div>`}function renderEquipment(){$('#equipmentTable').innerHTML=`<div class=tablewrap><table><tr><th>Equipamento</th><th>Série</th><th>Local</th><th>Medidor</th></tr>${equipment.map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.serial_number)}</td><td>${esc(e.team)}</td><td>${e.current_meter||0} ${esc(e.meter_unit)}</td></tr>`).join('')}</table></div>`}function renderAttendance(){const date=$('#attDate').value,team=$('#attTeam').value,es=active(employees).filter(e=>!team||e.team===team);$('#attendanceTable').innerHTML=`<div class=tablewrap><table><tr><th>Funcionário</th><th>Equipe</th><th>Diária</th><th>Status</th></tr>${es.map(e=>{const r=rec(date,e.id)||{};return `<tr><td>${esc(e.name)}</td><td>${esc(e.team)}</td><td>${money(e.daily_rate)}</td><td><button class="btn ${r.status==='present'?'good':'soft'}" onclick="setAttendance('${e.id}','present')">Foi</button> <button class="btn ${r.status==='absent'?'bad':'soft'}" onclick="setAttendance('${e.id}','absent')">Não foi</button></td></tr>`}).join('')}</table></div>`}$('#attDate').onchange=refreshAll;$('#attTeam').onchange=renderAttendance;function renderMaint(){$('#maintTable').innerHTML=`<div class=tablewrap><table><tr><th>Data</th><th>Bem</th><th>Serviço</th><th>Peças</th><th>Mão de obra</th><th>Total</th></tr>${maintenance.map(m=>`<tr><td>${m.date}</td><td>${esc(an(m))}</td><td>${esc(m.type)}</td><td>${money(pc(m.id))}</td><td>${money(m.labor_cost)}</td><td>${money(pc(m.id)+Number(m.labor_cost||0))}</td></tr>`).join('')}</table></div>`}function renderFuel(){$('#fuelTable').innerHTML=`<div class=tablewrap><table><tr><th>Data</th><th>Condução</th><th>KM</th><th>Litros</th><th>Valor</th></tr>${fuel.map(f=>`<tr><td>${f.date}</td><td>${esc(vehicles.find(v=>v.id===f.vehicle_id)?.name)}</td><td>${f.odometer_km}</td><td>${f.liters}</td><td>${money(f.total_value)}</td></tr>`).join('')}</table></div>`}function renderKm(){$('#kmTable').innerHTML=`<div class=tablewrap><table><tr><th>Data</th><th>Condução</th><th>Inicial</th><th>Final</th><th>Rodado</th></tr>${mileage.map(m=>`<tr><td>${m.date}</td><td>${esc(vehicles.find(v=>v.id===m.vehicle_id)?.name)}</td><td>${m.start_km}</td><td>${m.end_km}</td><td>${Number(m.end_km)-Number(m.start_km)} km</td></tr>`).join('')}</table></div>`}function renderDocs(){if(profile.role!=='admin')return;$('#docTable').innerHTML=`<div class=tablewrap><table><tr><th>Funcionário</th><th>Tipo</th><th>Arquivo</th><th></th></tr>${documents.map(d=>`<tr><td>${esc(employees.find(e=>e.id===d.employee_id)?.name)}</td><td>${esc(d.doc_type)}</td><td>${esc(d.file_name)}</td><td><button class="btn soft" onclick="openDoc('${d.storage_path}')">Abrir</button></td></tr>`).join('')}</table></div>`}function renderRecentPoints(){if(!$('#recentPointTable'))return;$('#recentPointTable').innerHTML=`<div class=tablewrap><table><tr><th>Horário</th><th>Funcionário</th><th>Matrícula</th><th>GPS</th><th>Face</th><th>Comprovante</th></tr>${pointEvents.map(r=>`<tr><td>${new Date(r.occurred_at).toLocaleString('pt-BR')}</td><td>${esc(r.employee_name)}</td><td>${esc(r.registration)}</td><td>${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)}</td><td>${r.face_verified===true?'✅ Validada':r.face_verified===false?'⏳ Pendente':'—'}</td><td>${esc(r.proof_code)}</td></tr>`).join('')}</table></div>`}function renderDashboard(){$('#kpiPresent').textContent=attendance.filter(r=>r.work_date===today&&r.status==='present').length;$('#kpiVehicles').textContent=active(vehicles).length;$('#kpiEquip').textContent=active(equipment).length;const mc=maintenance.filter(m=>m.date>=ms).reduce((s,m)=>s+Number(m.labor_cost||0)+pc(m.id),0),fc=fuel.filter(f=>f.date>=ms).reduce((s,f)=>s+Number(f.total_value||0),0);$('#kpiMonthCost').textContent=money(mc+fc)}
async function calcEarnings(){
 const s=$('#earnStart').value,e=$('#earnEnd').value;
 const{data,error}=await sb.rpc('employee_earnings',{p_start:s,p_end:e});
 if(error){$('#earningsTable').innerHTML='<div class="note">'+esc(error.message)+'</div>';return}
 const rows=data||[];
 $('#earnDays').textContent=rows.reduce((a,r)=>a+Number(r.present_days||0),0).toLocaleString('pt-BR');
 $('#earnTotal').textContent=money(rows.reduce((a,r)=>a+Number(r.total_earned||0),0));
 $('#earningsTable').innerHTML=`<div class=tablewrap><table><tr><th>Funcionário</th><th>Equipe</th><th>Diária</th><th>Foi</th><th>Faltou</th><th>Diárias</th><th>Extras/Bônus</th><th>Descontos/Adiant.</th><th>Total ganho</th></tr>${rows.map(r=>`<tr><td>${esc(r.employee_name)}</td><td>${esc(r.team)}</td><td>${money(r.daily_rate)}</td><td>${r.present_days}</td><td>${r.absent_days}</td><td>${money(r.daily_total)}</td><td>${money(Number(r.attendance_extras||0)+Number(r.bonuses||0))}</td><td>${money(Number(r.attendance_discounts||0)+Number(r.advances||0)+Number(r.adjustment_discounts||0))}</td><td class=money>${money(r.total_earned)}</td></tr>`).join('')}</table></div>`;
}
$('#calcEarnings').onclick=calcEarnings;$('#earnStart').onchange=calcEarnings;$('#earnEnd').onchange=calcEarnings;
function calcReport(){const s=$('#repStart').value,e=$('#repEnd').value,vid=$('#repVehicle').value,vs=vehicles.filter(v=>!vid||v.id===vid),rows=[];for(const v of vs){const fl=fuel.filter(x=>x.vehicle_id===v.id&&x.date>=s&&x.date<=e),ml=maintenance.filter(x=>x.asset_type==='vehicle'&&x.asset_id===v.id&&x.date>=s&&x.date<=e),kl=mileage.filter(x=>x.vehicle_id===v.id&&x.date>=s&&x.date<=e);const fuelCost=fl.reduce((a,x)=>a+Number(x.total_value||0),0),maintCost=ml.reduce((a,x)=>a+Number(x.labor_cost||0)+pc(x.id),0),km=kl.reduce((a,x)=>a+Number(x.end_km)-Number(x.start_km),0);rows.push({v,fuelCost,maintCost,km})}$('#repFuelCost').textContent=money(rows.reduce((a,r)=>a+r.fuelCost,0));$('#repMaintCost').textContent=money(rows.reduce((a,r)=>a+r.maintCost,0));$('#repKm').textContent=rows.reduce((a,r)=>a+r.km,0).toLocaleString('pt-BR')+' km';$('#reportTable').innerHTML=`<div class=tablewrap><table><tr><th>Condução</th><th>Combustível</th><th>Manutenção</th><th>KM</th><th>Total</th></tr>${rows.map(r=>`<tr><td>${esc(r.v.name)}</td><td>${money(r.fuelCost)}</td><td>${money(r.maintCost)}</td><td>${r.km}</td><td>${money(r.fuelCost+r.maintCost)}</td></tr>`).join('')}</table></div>`;return rows}$('#calcReport').onclick=calcReport;$('#repVehicle').onchange=calcReport;$('#repStart').onchange=calcReport;$('#repEnd').onchange=calcReport;$('#exportReport').onclick=()=>{const rows=calcReport(),data=[['Condução','Combustível','Manutenção','KM','Total'],...rows.map(r=>[r.v.name,r.fuelCost,r.maintCost,r.km,r.fuelCost+r.maintCost])],csv=data.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n'),b=new Blob(['\ufeff'+csv],{type:'text/csv'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='relatorio_frota.csv';a.click();URL.revokeObjectURL(u)};let ch;function subscribe(){ch=sb.channel('ponto-live').on('postgres_changes',{event:'*',schema:'public'},()=>refreshAll()).subscribe()}if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw-v11-0.js?v=11-0-20260817',{updateViaCache:'none'}).catch(()=>{});init();
