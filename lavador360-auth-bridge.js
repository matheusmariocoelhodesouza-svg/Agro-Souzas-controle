(()=>{
'use strict';
const PROJECT_REF='aycbrqziusxtxhsdfqjk';
const COMANDO_SESSION_KEY='controla_beta_session';
const SUPABASE_SESSION_KEY='sb-'+PROJECT_REF+'-auth-token';
const DIRECT_COPY='Entre diretamente no Lavador 360 com a mesma conta do ecossistema 360. Frota, oficina e dados continuam compartilhados automaticamente.';

function applyLavadorTheme(){
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute('content','#f97316');
  const manifest=document.querySelector('link[rel="manifest"]');
  if(manifest)manifest.setAttribute('href','./lavador360.webmanifest?v=20260929-3');
  const favicon=document.querySelector('link[rel="icon"]');
  if(favicon){
    favicon.setAttribute('href','./lavador360-icon-orange-bus.png?v=20260929-3');
    favicon.setAttribute('type','image/png');
  }
  const appleIcon=document.querySelector('link[rel="apple-touch-icon"]');
  if(appleIcon)appleIcon.setAttribute('href','./lavador360-icon-orange-bus.png?v=20260929-3');
  if(document.getElementById('l360OrangeTheme'))return;
  const style=document.createElement('style');
  style.id='l360OrangeTheme';
  style.textContent=`
    :root{
      --bg:#f8f5f1;
      --surface:#ffffff;
      --ink:#261b15;
      --muted:#74675f;
      --line:#eaded5;
      --brand:#f97316;
      --brand2:#fb923c;
      --deep:#2a1408;
      --soft:#fff1e8;
      --ok:#ea580c;
      --shadow:0 14px 40px rgba(124,45,18,.09);
    }
    .sidebar{background:linear-gradient(180deg,#211008 0%,#351807 100%)}
    .brand-mark,.gate-mark{background:linear-gradient(135deg,#fb923c,#f97316);box-shadow:0 10px 26px rgba(249,115,22,.28)}
    .brand small{color:#ddbaa2}
    .company-card span{color:#cfa58b}
    .company-card small{color:#fdba74}
    .side-nav button{color:#e4cbbc}
    .side-nav button:hover,.side-nav button.active{background:rgba(249,115,22,.24);color:#fff}
    .sidebar-bottom a,.link-btn{color:#fdba74}
    .sidebar-bottom small{color:#9e806d}
    .topbar{background:rgba(248,245,241,.94);border-bottom-color:#eaded5}
    .btn.primary{background:linear-gradient(135deg,#fb923c,#f97316);box-shadow:0 8px 18px rgba(249,115,22,.24)}
    .btn.soft{border-color:#ead7c8;color:#7c2d12}
    label{color:#65534a}
    input,select,textarea{border-color:#e5d7ce;background:#fffdfa}
    input:focus,select:focus,textarea:focus{border-color:#fb923c;box-shadow:0 0 0 3px #ffedd5}
    .list-row,.product-card,.price-row,.wash-card,.usage-item{border-color:#eaded5}
    .product-stat,.wash-metric{background:#fbf6f2}
    .wash-summary{background:#431c08;box-shadow:0 18px 50px rgba(67,28,8,.27)}
    .wash-summary span{color:#fdba74}
    .chip.ok{background:#fff1e8;color:#c2410c}
    .chip.brand{background:#fff1e8;color:#ea580c}
    .direct-badge{background:#fff1e8;color:#c2410c}
    .session-gate{background:radial-gradient(circle at top,#c2410c 0%,#431c08 45%,#170a04 100%)}
    .toast{background:#431c08}
    .toast.ok{background:#c2410c}
    @media(max-width:760px){.sidebar{background:#2a1408}}
  `;
  document.head.appendChild(style);
}

function migrateComandoSession(){
  try{
    const raw=localStorage.getItem(COMANDO_SESSION_KEY);
    if(!raw)return false;
    const session=JSON.parse(raw);
    if(!session?.access_token||!session?.refresh_token)return false;
    localStorage.setItem(SUPABASE_SESSION_KEY,JSON.stringify({
      access_token:session.access_token,
      refresh_token:session.refresh_token,
      token_type:session.token_type||'bearer',
      expires_in:session.expires_in||3600,
      expires_at:session.expires_at||null,
      user:session.user||null
    }));
    document.documentElement.dataset.lavadorSessionBridge='ready';
    return true;
  }catch(err){
    console.warn('Lavador 360: não foi possível herdar a sessão do Comando 360',err);
    return false;
  }
}

function authMessage(error){
  const text=String(error?.message||'').toLowerCase();
  if(text.includes('invalid login credentials'))return 'E-mail ou senha inválidos.';
  if(text.includes('email not confirmed'))return 'Confirme seu e-mail antes de entrar.';
  if(text.includes('too many requests'))return 'Muitas tentativas. Tente novamente em instantes.';
  return error?.message||'Não foi possível entrar agora.';
}

function renderStandaloneLogin(){
  applyLavadorTheme();
  const card=document.querySelector('#sessionGate .gate-card');
  if(!card||document.getElementById('l360StandaloneLogin'))return;
  const intro=card.querySelector('p');
  if(intro)intro.textContent=DIRECT_COPY;
  const badge=document.createElement('div');
  badge.className='direct-badge'; badge.textContent='● ACESSO INDEPENDENTE';
  card.querySelector('h1')?.insertAdjacentElement('afterend',badge);
  const form=document.createElement('form');
  form.id='l360StandaloneLogin'; form.className='standalone-login'; form.autocomplete='on';
  form.innerHTML='<label>E-mail<input name="email" type="email" inputmode="email" autocomplete="username" placeholder="seu@email.com" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" placeholder="Sua senha" required></label><button class="btn primary wide" type="submit">Entrar no Lavador 360</button><p class="login-status" role="status" aria-live="polite"></p>';
  const link=card.querySelector('a.btn');
  card.insertBefore(form,link||null);
  if(link){link.classList.remove('primary');link.classList.add('soft');link.textContent='Abrir Comando 360';}
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const status=form.querySelector('.login-status'),button=form.querySelector('button');
    status.className='login-status';status.textContent='';
    if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){status.classList.add('error');status.textContent='Configuração do sistema não carregou.';return;}
    button.disabled=true;button.textContent='Entrando...';
    try{
      const client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data,error}=await client.auth.signInWithPassword({email:form.elements.email.value.trim(),password:form.elements.password.value});
      if(error)throw error;
      if(!data?.session)throw new Error('A sessão não foi criada.');
      try{localStorage.setItem(COMANDO_SESSION_KEY,JSON.stringify(data.session));}catch(_){}
      status.classList.add('ok');status.textContent='Acesso liberado.';
      location.reload();
    }catch(err){
      console.error('Lavador 360: falha no login direto',err);
      status.classList.add('error');status.textContent=authMessage(err);button.disabled=false;button.textContent='Entrar no Lavador 360';
    }
  });
}

applyLavadorTheme();
migrateComandoSession();
window.c360MigrateSessionToLavador=migrateComandoSession;
document.addEventListener('DOMContentLoaded',renderStandaloneLogin,{once:true});
})();