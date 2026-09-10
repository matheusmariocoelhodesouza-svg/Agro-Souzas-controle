from pathlib import Path
import re

root=Path(__file__).resolve().parents[1]
index_path=root/'index.html'
app_path=root/'app-v8.js'
css_path=root/'assets'/'app-v8.css'
css_path.parent.mkdir(parents=True,exist_ok=True)

index=index_path.read_text(encoding='utf-8')
original_index=index

# ---------------- Shell / version ----------------
index=index.replace('<title>Comando 360 • v7.02</title>','<title>Comando 360 • v8.00</title>')
index=index.replace('Comando 360 • v7.02','Comando 360 • v8.00')

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

# Ensure the external CSS is referenced exactly once.
if 'assets/app-v8.css' not in index:
    if head_end==-1: raise RuntimeError('Cabeçalho HTML inválido.')
    index=index[:head_end]+'<link rel="stylesheet" href="./assets/app-v8.css"/>\n'+index[head_end:]

# Core scripts may have been adjacent to the extracted inline script; ensure they remain.
app_tag='<script src="./app-v8.js"></script>'
if 'src="./c360-core-network.js"' not in index:
    index=index.replace(app_tag,core+app_tag,1)

index_path.write_text(index,encoding='utf-8')
print('Comando 360 v8 modularizado: index.html + assets/app-v8.css + app-v8.js')
print('index.html:',len(index.encode('utf-8')),'bytes')
print('app-v8.js:',len(app.encode('utf-8')),'bytes')
