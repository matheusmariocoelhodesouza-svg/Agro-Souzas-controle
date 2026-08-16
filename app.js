const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));const today=new Date().toISOString().slice(0,10),d=new Date();d.setDate(1);const ms=d.toISOString().slice(0,10);['#attDate','#maintDate','#fuelDate','#kmDate'].forEach(x=>$(x).value=today);$('#repStart').value=ms;$('#repEnd').value=today;$('#earnStart').value=ms;$('#earnEnd').value=today;let sb,user,profile,employees=[],vehicles=[],equipment=[],attendance=[],maintenance=[],parts=[],fuel=[],mileage=[],documents=[],pointEvents=[];
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
const APP_TABS=['painel','ponto2','ponto','funcionarios','frota','equipamentos','manutencoes','combustivel','km','relatorios'];
function showTab(tab){
  APP_TABS.forEach(t=>{
    const el=$('#tab-'+t);
    if(!el)return;
    const active=t===tab;
    el.classList.toggle('hidden',!active);
    el.style.display=active?'block':'none';
  });
  $$('nav button[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
  if(tab==='ponto2'){
    const p=$('#tab-ponto2');
    if(p){p.style.minHeight='200px';}
  }
}
$$('nav button[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
async function refreshAll(){const q=await Promise.all([sb.from('employees').select('*').order('name'),sb.from('vehicles').select('*').order('name'),sb.from('equipment').select('*').order('name'),sb.from('attendance').select('*').gte('work_date',ms).lte('work_date',today),sb.from('maintenance').select('*').order('date',{ascending:false}),sb.from('maintenance_parts').select('*'),sb.from('fuel_logs').select('*').order('date',{ascending:false}),sb.from('mileage_logs').select('*').order('date',{ascending:false}),profile.role==='admin'?sb.from('employee_documents').select('*').order('created_at',{ascending:false}):Promise.resolve({data:[]}),sb.from('point_event_receipts').select('*').order('occurred_at',{ascending:false}).limit(30)]);[employees,vehicles,equipment,attendance,maintenance,parts,fuel,mileage,documents,pointEvents]=q.map(x=>x.data||[]);fill();renderAll()}
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


function gpsPosition(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Geolocalização não disponível'));navigator.geolocation.getCurrentPosition(resolve,e=>reject(new Error(e.message||'Não foi possível obter a localização')),{enableHighAccuracy:true,timeout:15000,maximumAge:0})})}
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
 $('#punchReceipt').innerHTML=`<strong>✅ Ponto registrado</strong><br><b>${esc(r.employee_name)}</b><br>Método: <b>${method}</b><br>Horário: ${esc(when)}<br>GPS: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}<br>Precisão: ${Math.round(pos.coords.accuracy||0)} m${distance!=null?`<br>Validação facial aprovada (${Number(distance).toFixed(3)})`:''}<br>Código: <b>${esc(r.proof_code)}</b>`;
 $('#punchReceipt').classList.remove('hidden');
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
$('#facialPunchBtn').onclick=async()=>{
 const f=$('#facialPunchPhoto').files[0];
 if(!f)return alert('Tire uma foto do rosto');
 $('#punchStatus').textContent='Analisando rosto...';
 $('#punchReceipt').classList.add('hidden');
 try{
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
   $('#facialPunchPhoto').value='';
   $('#punchStatus').textContent='';
   await refreshAll();
 }catch(e){$('#punchStatus').textContent=e.message||String(e)}
};
$('#uploadDoc').onclick=async()=>{const f=$('#docFile').files[0],employee_id=$('#docEmp').value;if(!f)return alert('Selecione um arquivo');const path=`${employee_id}/${crypto.randomUUID()}.${(f.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'')}`;const up=await sb.storage.from('employee-documents').upload(path,f);if(up.error)return alert(up.error.message);const ins=await sb.from('employee_documents').insert({employee_id,doc_type:$('#docType').value,storage_path:path,file_name:f.name,uploaded_by:user.id});if(ins.error)alert(ins.error.message);else refreshAll()};window.openDoc=async p=>{const{data,error}=await sb.storage.from('employee-documents').createSignedUrl(p,60);if(error)alert(error.message);else window.open(data.signedUrl,'_blank')};
function pc(id){return parts.filter(p=>p.maintenance_id===id).reduce((s,p)=>s+Number(p.quantity)*Number(p.unit_value),0)}function an(m){const a=m.asset_type==='vehicle'?vehicles.find(x=>x.id===m.asset_id):equipment.find(x=>x.id===m.asset_id);return a?.name||'-'}function renderAll(){renderEmployees();renderVehicles();renderEquipment();renderAttendance();renderMaint();renderFuel();renderKm();renderDocs();renderDashboard();renderRecentPoints();calcEarnings();calcReport()}function renderEmployees(){$('#empTable').innerHTML=`<div class=tablewrap><table><tr><th>Nome</th><th>Matrícula</th><th>Equipe</th><th>Diária</th><th>Biometria</th><th>Status</th><th>Ações</th></tr>${employees.map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.registration)}</td><td>${esc(e.team)}</td><td>${money(e.daily_rate)}</td><td>${e.biometric_enabled?'✅ Cadastrada':'—'}</td><td>${e.active===false?'Inativo':'Ativo'}</td><td>${profile.role==='admin'?`<button class="btn soft" onclick="editEmployee('${e.id}')">Editar</button> <button class="btn bad" onclick="deleteEmployee('${e.id}')">Excluir</button>`:''}</td></tr>`).join('')}</table></div>`}function renderVehicles(){$('#vehicleTable').innerHTML=`<div class=tablewrap><table><tr><th>Condução</th><th>Placa</th><th>Modelo</th><th>KM</th><th>Licenciamento</th></tr>${vehicles.map(v=>`<tr><td>${esc(v.name)}</td><td>${esc(v.plate)}</td><td>${esc(v.model)}</td><td>${Number(v.current_km||0).toLocaleString('pt-BR')}</td><td>${v.license_due||''}</td></tr>`).join('')}</table></div>`}function renderEquipment(){$('#equipmentTable').innerHTML=`<div class=tablewrap><table><tr><th>Equipamento</th><th>Série</th><th>Local</th><th>Medidor</th></tr>${equipment.map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.serial_number)}</td><td>${esc(e.team)}</td><td>${e.current_meter||0} ${esc(e.meter_unit)}</td></tr>`).join('')}</table></div>`}function renderAttendance(){const date=$('#attDate').value,team=$('#attTeam').value,es=active(employees).filter(e=>!team||e.team===team);$('#attendanceTable').innerHTML=`<div class=tablewrap><table><tr><th>Funcionário</th><th>Equipe</th><th>Diária</th><th>Status</th></tr>${es.map(e=>{const r=rec(date,e.id)||{};return `<tr><td>${esc(e.name)}</td><td>${esc(e.team)}</td><td>${money(e.daily_rate)}</td><td><button class="btn ${r.status==='present'?'good':'soft'}" onclick="setAttendance('${e.id}','present')">Foi</button> <button class="btn ${r.status==='absent'?'bad':'soft'}" onclick="setAttendance('${e.id}','absent')">Não foi</button></td></tr>`}).join('')}</table></div>`}$('#attDate').onchange=refreshAll;$('#attTeam').onchange=renderAttendance;function renderMaint(){$('#maintTable').innerHTML=`<div class=tablewrap><table><tr><th>Data</th><th>Bem</th><th>Serviço</th><th>Peças</th><th>Mão de obra</th><th>Total</th></tr>${maintenance.map(m=>`<tr><td>${m.date}</td><td>${esc(an(m))}</td><td>${esc(m.type)}</td><td>${money(pc(m.id))}</td><td>${money(m.labor_cost)}</td><td>${money(pc(m.id)+Number(m.labor_cost||0))}</td></tr>`).join('')}</table></div>`}function renderFuel(){$('#fuelTable').innerHTML=`<div class=tablewrap><table><tr><th>Data</th><th>Condução</th><th>KM</th><th>Litros</th><th>Valor</th></tr>${fuel.map(f=>`<tr><td>${f.date}</td><td>${esc(vehicles.find(v=>v.id===f.vehicle_id)?.name)}</td><td>${f.odometer_km}</td><td>${f.liters}</td><td>${money(f.total_value)}</td></tr>`).join('')}</table></div>`}function renderKm(){$('#kmTable').innerHTML=`<div class=tablewrap><table><tr><th>Data</th><th>Condução</th><th>Inicial</th><th>Final</th><th>Rodado</th></tr>${mileage.map(m=>`<tr><td>${m.date}</td><td>${esc(vehicles.find(v=>v.id===m.vehicle_id)?.name)}</td><td>${m.start_km}</td><td>${m.end_km}</td><td>${Number(m.end_km)-Number(m.start_km)} km</td></tr>`).join('')}</table></div>`}function renderDocs(){if(profile.role!=='admin')return;$('#docTable').innerHTML=`<div class=tablewrap><table><tr><th>Funcionário</th><th>Tipo</th><th>Arquivo</th><th></th></tr>${documents.map(d=>`<tr><td>${esc(employees.find(e=>e.id===d.employee_id)?.name)}</td><td>${esc(d.doc_type)}</td><td>${esc(d.file_name)}</td><td><button class="btn soft" onclick="openDoc('${d.storage_path}')">Abrir</button></td></tr>`).join('')}</table></div>`}function renderRecentPoints(){if(!$('#recentPointTable'))return;$('#recentPointTable').innerHTML=`<div class=tablewrap><table><tr><th>Horário</th><th>Funcionário</th><th>Matrícula</th><th>GPS</th><th>Face</th><th>Comprovante</th></tr>${pointEvents.map(r=>`<tr><td>${new Date(r.occurred_at).toLocaleString('pt-BR')}</td><td>${esc(r.employee_name)}</td><td>${esc(r.registration)}</td><td>${Number(r.latitude).toFixed(5)}, ${Number(r.longitude).toFixed(5)}</td><td>${r.face_verified===true?'✅ Validada':r.face_verified===false?'⏳ Pendente':'—'}</td><td>${esc(r.proof_code)}</td></tr>`).join('')}</table></div>`}function renderDashboard(){$('#kpiPresent').textContent=attendance.filter(r=>r.work_date===today&&r.status==='present').length;$('#kpiVehicles').textContent=active(vehicles).length;$('#kpiEquip').textContent=active(equipment).length;const mc=maintenance.filter(m=>m.date>=ms).reduce((s,m)=>s+Number(m.labor_cost||0)+pc(m.id),0),fc=fuel.filter(f=>f.date>=ms).reduce((s,f)=>s+Number(f.total_value||0),0);$('#kpiMonthCost').textContent=money(mc+fc)}
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
function calcReport(){const s=$('#repStart').value,e=$('#repEnd').value,vid=$('#repVehicle').value,vs=vehicles.filter(v=>!vid||v.id===vid),rows=[];for(const v of vs){const fl=fuel.filter(x=>x.vehicle_id===v.id&&x.date>=s&&x.date<=e),ml=maintenance.filter(x=>x.asset_type==='vehicle'&&x.asset_id===v.id&&x.date>=s&&x.date<=e),kl=mileage.filter(x=>x.vehicle_id===v.id&&x.date>=s&&x.date<=e);const fuelCost=fl.reduce((a,x)=>a+Number(x.total_value||0),0),maintCost=ml.reduce((a,x)=>a+Number(x.labor_cost||0)+pc(x.id),0),km=kl.reduce((a,x)=>a+Number(x.end_km)-Number(x.start_km),0);rows.push({v,fuelCost,maintCost,km})}$('#repFuelCost').textContent=money(rows.reduce((a,r)=>a+r.fuelCost,0));$('#repMaintCost').textContent=money(rows.reduce((a,r)=>a+r.maintCost,0));$('#repKm').textContent=rows.reduce((a,r)=>a+r.km,0).toLocaleString('pt-BR')+' km';$('#reportTable').innerHTML=`<div class=tablewrap><table><tr><th>Condução</th><th>Combustível</th><th>Manutenção</th><th>KM</th><th>Total</th></tr>${rows.map(r=>`<tr><td>${esc(r.v.name)}</td><td>${money(r.fuelCost)}</td><td>${money(r.maintCost)}</td><td>${r.km}</td><td>${money(r.fuelCost+r.maintCost)}</td></tr>`).join('')}</table></div>`;return rows}$('#calcReport').onclick=calcReport;$('#repVehicle').onchange=calcReport;$('#repStart').onchange=calcReport;$('#repEnd').onchange=calcReport;$('#exportReport').onclick=()=>{const rows=calcReport(),data=[['Condução','Combustível','Manutenção','KM','Total'],...rows.map(r=>[r.v.name,r.fuelCost,r.maintCost,r.km,r.fuelCost+r.maintCost])],csv=data.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(';')).join('\n'),b=new Blob(['\ufeff'+csv],{type:'text/csv'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='relatorio_frota.csv';a.click();URL.revokeObjectURL(u)};let ch;function subscribe(){ch=sb.channel('ponto-live').on('postgres_changes',{event:'*',schema:'public'},()=>refreshAll()).subscribe()}if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw-v8.js?v=8-20260816',{updateViaCache:'none'}).catch(()=>{});init();
