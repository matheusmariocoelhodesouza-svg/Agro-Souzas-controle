from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
index_path=root/'index.html'
app_path=root/'app-v8.js'
css_path=root/'assets'/'app-v8.css'
css_path.parent.mkdir(parents=True,exist_ok=True)

index=index_path.read_text(encoding='utf-8')

# ---------------- Shell / version ----------------
index=index.replace('<title>Comando 360 • v7.02</title>','<title>Comando 360 • v8.00</title>')
index=index.replace('Comando 360 • v7.02','Comando 360 • v8.00')
index=index.replace("const BUILD='7.02';","const BUILD='8.00';")

# Core scripts load before the application bundle.
main_marker="<script>\n'use strict';"
core='<script src="./c360-core-network.js"></script>\n<script src="./c360-core-ui.js"></script>\n'
if 'src="./c360-core-network.js"' not in index and main_marker in index:
    index=index.replace(main_marker,core+main_marker,1)

# ---------------- Extract the huge inline application JS ----------------
if main_marker in index:
    start=index.index(main_marker)
    code_start=start+len('<script>\n')
    body_end=index.rfind('</body>')
    end=index.rfind('</script>',start,body_end if body_end!=-1 else len(index))
    if end<=code_start:
        raise RuntimeError('Não encontrei o fechamento do script principal.')
    app=index[code_start:end].strip()+"\n"
    index=index[:start]+'<script src="./app-v8.js"></script>'+index[end+len('</script>'):]
elif app_path.exists():
    app=app_path.read_text(encoding='utf-8')
else:
    raise RuntimeError('Nem o script inline nem app-v8.js foram encontrados.')

# ---------------- Application hardening ----------------
app=app.replace("navigator.serviceWorker.register('./sw-v7-02.js'","navigator.serviceWorker.register('./sw-v8-00.js'")
app=app.replace('navigator.onLine','c360NetOnline()')

# Company identity must come from v2_companies/settings, never from Client Zero constants.
app=re.sub(
    r"const EMPLOYER_FALLBACK=\{legal_name:'[^']*',tax_id:'[^']*'\};",
    "const EMPLOYER_FALLBACK={legal_name:'',tax_id:''};",
    app,
    count=1,
)
app=app.replace('Nágila Severino de Araújo Apanha de Aves Vivas','Dados da empresa não configurados')
app=app.replace('Nágila Severino de Araújo apanho de aves vivas','Dados da empresa não configurados')
app=app.replace('53422038000119','')

# Never hide the Beta name; c360-core-ui.js adds a prominent environment banner.
app=re.sub(
    r"function cleanCompanyName\(v\)\{\s*const s=String\(v\|\|[\"']Empresa[\"']\)\.replace\(/\\s\*\[•-\]\?\\s\*BETA\(\?:\\s\*-\\s\*DADOS FICTÍCIOS\)\?/gi,''\)\.trim\(\);\s*return s\|\|[\"']Empresa[\"'];\s*\}",
    "function cleanCompanyName(v){\n const s=String(v||'Empresa').trim();\n return s||'Empresa';\n}",
    app,
    count=1,
)

# Use the selected company timezone in formatter helpers.
app=app.replace("timeZone:'America/Sao_Paulo'","timeZone:(companyProfile?.timezone||'America/Sao_Paulo')")
app=app.replace('timeZone:"America/Sao_Paulo"','timeZone:(companyProfile?.timezone||\'America/Sao_Paulo\')')

# Biometric evidence is V2-only from this version onward.
app=app.replace("const bucket=deviceMode?'v2-attendance-selfies':'biometric-selfies';","const bucket='v2-attendance-selfies';")
app=app.replace("'/storage/v1/object/biometric-selfies/'+path","'/storage/v1/object/v2-face-references/'+path")
legacy_pattern=re.compile(
    r"\n\s*// Compatibilidade com o cadastro facial legado; falha aqui não bloqueia a Biometria V2\.\n\s*try\{await rpc\('enroll_employee_face',\{p_employee_id:employeeId,p_photo_storage_path:facePath\}\)\}\n\s*catch\(e\)\{console\.warn\('enroll_employee_face legado',e\)\}\n",
    re.M,
)
app=legacy_pattern.sub('\n',app,count=1)

# Dedicated V2 photo buckets. Existing photos remain readable from the legacy bucket during migration.
old_employee_reader="""async function employeePhotoObjectUrl(path){
 if(!path)return '';
 if(employeePhotoUrls[path])return employeePhotoUrls[path];
 try{const r=await authFetch('/storage/v1/object/employee-documents/'+path);if(!r.ok)throw new Error('Foto indisponível');const b=await r.blob();const u=URL.createObjectURL(b);employeePhotoUrls[path]=u;return u}catch(e){console.warn('employee photo',e);return ''}
}"""
new_employee_reader="""async function employeePhotoObjectUrl(path){
 if(!path)return '';
 if(employeePhotoUrls[path])return employeePhotoUrls[path];
 for(const bucket of ['v2-employee-photos','employee-documents']){
  try{const r=await authFetch('/storage/v1/object/'+bucket+'/'+path);if(!r.ok)continue;const b=await r.blob();const u=URL.createObjectURL(b);employeePhotoUrls[path]=u;return u}catch(_){}
 }
 console.warn('employee photo unavailable',path);return '';
}"""
app=app.replace(old_employee_reader,new_employee_reader)

app=app.replace(
    "const r=await fetch(API_URL+'/storage/v1/object/employee-documents/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':file.type||'image/jpeg','x-upsert':'false'},body:file});await parseResponse(r);return path",
    "const r=await fetch(API_URL+'/storage/v1/object/v2-employee-photos/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.access_token,'Content-Type':file.type||'image/jpeg','x-upsert':'false'},body:file});await parseResponse(r);return path",
    1,
)

old_profile_file="""async function profilePhotoAsFile(employee){
 if(!employee?.photo_path)throw new Error('Este funcionário ainda não possui foto de perfil.');
 const r=await authFetch('/storage/v1/object/employee-documents/'+employee.photo_path);
 if(!r.ok)throw new Error('Não foi possível abrir a foto de perfil.');
 const blob=await r.blob();
 const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
 return new File([blob],'perfil-'+employee.id+'.'+ext,{type:blob.type||'image/jpeg'});
}"""
new_profile_file="""async function profilePhotoAsFile(employee){
 if(!employee?.photo_path)throw new Error('Este funcionário ainda não possui foto de perfil.');
 let blob=null;
 for(const bucket of ['v2-employee-photos','employee-documents']){
  try{const r=await authFetch('/storage/v1/object/'+bucket+'/'+employee.photo_path);if(r.ok){blob=await r.blob();break}}catch(_){}
 }
 if(!blob)throw new Error('Não foi possível abrir a foto de perfil.');
 const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
 return new File([blob],'perfil-'+employee.id+'.'+ext,{type:blob.type||'image/jpeg'});
}"""
app=app.replace(old_profile_file,new_profile_file)

old_vehicle_reader="""async function vehiclePhotoObjectUrl(path){if(!path)return '';if(vehiclePhotoUrls[path])return vehiclePhotoUrls[path];try{const r=await authFetch('/storage/v1/object/employee-documents/'+path);if(!r.ok)throw new Error('Foto indisponível');const b=await r.blob();const u=URL.createObjectURL(b);vehiclePhotoUrls[path]=u;return u}catch(e){console.warn('vehicle photo',e);return ''}}"""
new_vehicle_reader="""async function vehiclePhotoObjectUrl(path){if(!path)return '';if(vehiclePhotoUrls[path])return vehiclePhotoUrls[path];for(const bucket of ['v2-vehicle-photos','employee-documents']){try{const r=await authFetch('/storage/v1/object/'+bucket+'/'+path);if(!r.ok)continue;const b=await r.blob();const u=URL.createObjectURL(b);vehiclePhotoUrls[path]=u;return u}catch(_){}}console.warn('vehicle photo unavailable',path);return ''}"""
app=app.replace(old_vehicle_reader,new_vehicle_reader)

old_vehicle_upload="""async function uploadVehiclePhoto(file,vehicleId){const sess=session();const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=companyId+'/vehicles/'+vehicleId+'/profile-'+Date.now()+'.'+ext;const r=await fetch(API_URL+'/storage/v1/object/employee-documents/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+sess.access_token,'Content-Type':file.type||'image/jpeg','x-upsert':'false'},body:file});await parseResponse(r);return path}"""
new_vehicle_upload="""async function uploadVehiclePhoto(file,vehicleId){const sess=session();const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=companyId+'/vehicles/'+vehicleId+'/profile-'+Date.now()+'.'+ext;const r=await fetch(API_URL+'/storage/v1/object/v2-vehicle-photos/'+path,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+sess.access_token,'Content-Type':file.type||'image/jpeg','x-upsert':'false'},body:file});await parseResponse(r);return path}"""
app=app.replace(old_vehicle_upload,new_vehicle_upload)

app_path.write_text(app,encoding='utf-8')

# ---------------- Extract head CSS ----------------
head_end=index.find('</head>')
head=index[:head_end] if head_end!=-1 else index
style_match=re.search(r'<style>(.*?)</style>',head,re.S)
if style_match:
    css=style_match.group(1).strip()+"\n"
    css_path.write_text(css,encoding='utf-8')
    index=index[:style_match.start()]+'<link rel="stylesheet" href="./assets/app-v8.css"/>'+index[style_match.end():]
elif not css_path.exists():
    raise RuntimeError('CSS principal não encontrado para modularização.')

if 'assets/app-v8.css' not in index:
    if head_end==-1: raise RuntimeError('Cabeçalho HTML inválido.')
    index=index[:head_end]+'<link rel="stylesheet" href="./assets/app-v8.css"/>\n'+index[head_end:]

app_tag='<script src="./app-v8.js"></script>'
if 'src="./c360-core-network.js"' not in index:
    index=index.replace(app_tag,core+app_tag,1)

index_path.write_text(index,encoding='utf-8')
print('Comando 360 v8 modularizado: index.html + assets/app-v8.css + app-v8.js')
print('index.html:',len(index.encode('utf-8')),'bytes')
print('app-v8.js:',len(app.encode('utf-8')),'bytes')
