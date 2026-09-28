(()=>{
'use strict';
const PROJECT_REF='aycbrqziusxtxhsdfqjk';
const COMANDO_SESSION_KEY='controla_beta_session';
const SUPABASE_SESSION_KEY='sb-'+PROJECT_REF+'-auth-token';
const DIRECT_COPY='Entre diretamente no Oficina 360 com a mesma conta do Comando 360. A frota e o histórico continuam compartilhados automaticamente.';

function migrateComandoSession(){
  try{
    const raw=localStorage.getItem(COMANDO_SESSION_KEY);
    if(!raw)return false;
    const session=JSON.parse(raw);
    if(!session?.access_token||!session?.refresh_token)return false;
    const normalized={
      access_token:session.access_token,
      refresh_token:session.refresh_token,
      token_type:session.token_type||'bearer',
      expires_in:session.expires_in||3600,
      expires_at:session.expires_at||null,
      user:session.user||null
    };
    localStorage.setItem(SUPABASE_SESSION_KEY,JSON.stringify(normalized));
    document.documentElement.dataset.oficinaSessionBridge='ready';
    return true;
  }catch(err){
    console.warn('Oficina 360: não foi possível herdar a sessão do Comando 360',err);
    return false;
  }
}

function authMessage(error){
  const text=String(error?.message||'').toLowerCase();
  if(text.includes('invalid login credentials'))return 'E-mail ou senha inválidos.';
  if(text.includes('email not confirmed'))return 'Confirme seu e-mail antes de entrar.';
  if(text.includes('too many requests'))return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  return error?.message||'Não foi possível entrar agora.';
}

function injectStandaloneStyles(){
  if(document.getElementById('o360StandaloneStyles'))return;
  const style=document.createElement('style');
  style.id='o360StandaloneStyles';
  style.textContent=`
    .gate-card{width:min(440px,100%)}
    .o360-login{display:grid;gap:10px;text-align:left;margin:16px 0 12px}
    .o360-field{display:grid;gap:5px}
    .o360-field label{font-size:10px;font-weight:900;color:#5e7189;letter-spacing:.25px}
    .o360-field input{width:100%;height:46px;border:1px solid #d7e1ec;border-radius:11px;padding:0 12px;background:#f9fbfd;color:#142033;outline:none;font-size:13px}
    .o360-field input:focus{border-color:#5e9be1;box-shadow:0 0 0 3px #e8f2ff;background:#fff}
    .o360-login .o360-submit{width:100%;height:46px;border:0;border-radius:11px;background:linear-gradient(135deg,#1768d4,#123d70);color:#fff;font-weight:900;cursor:pointer;box-shadow:0 9px 22px rgba(23,104,212,.2)}
    .o360-login .o360-submit:disabled{opacity:.65;cursor:wait}
    .o360-login-status{min-height:17px;margin:0!important;font-size:10px!important;text-align:center;line-height:1.45!important;color:#6d8097!important}
    .o360-login-status.error{color:#b83b45!important}
    .o360-login-status.ok{color:#168a55!important}
    .o360-login-divider{display:flex;align-items:center;gap:10px;margin:12px 0 10px;color:#8a9bad;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.7px}
    .o360-login-divider:before,.o360-login-divider:after{content:"";height:1px;background:#e5ebf2;flex:1}
    .gate-card>a.o360-comando-link{display:flex;width:100%;background:#fff;color:#274766;border-color:#d9e3ed}
    .o360-direct-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:5px 9px;background:#eaf3ff;color:#1768d4;font-size:9px;font-weight:900;margin-top:10px}
  `;
  document.head.appendChild(style);
}

function keepDirectCopy(paragraph){
  if(!paragraph)return;
  const stale=new Set([
    'Abra o Oficina 360 a partir do Comando 360 para usar a mesma sessão e a mesma frota.',
    'Sua sessão do Comando 360 não está ativa neste navegador.'
  ]);
  if(stale.has(paragraph.textContent.trim()))paragraph.textContent=DIRECT_COPY;
  const observer=new MutationObserver(()=>{
    if(stale.has(paragraph.textContent.trim()))paragraph.textContent=DIRECT_COPY;
  });
  observer.observe(paragraph,{childList:true,characterData:true,subtree:true});
}

function renderStandaloneLogin(){
  const card=document.querySelector('#sessionGate .gate-card');
  if(!card||document.getElementById('o360StandaloneLogin'))return;

  const intro=card.querySelector('p');
  if(intro)intro.textContent=DIRECT_COPY;
  keepDirectCopy(intro);

  const badge=document.createElement('div');
  badge.className='o360-direct-badge';
  badge.textContent='● ACESSO INDEPENDENTE';
  card.querySelector('h1')?.insertAdjacentElement('afterend',badge);

  const form=document.createElement('form');
  form.id='o360StandaloneLogin';
  form.className='o360-login';
  form.autocomplete='on';
  form.innerHTML=`
    <div class="o360-field">
      <label for="o360LoginEmail">E-mail</label>
      <input id="o360LoginEmail" name="email" type="email" inputmode="email" autocomplete="username" placeholder="seu@email.com" required>
    </div>
    <div class="o360-field">
      <label for="o360LoginPassword">Senha</label>
      <input id="o360LoginPassword" name="password" type="password" autocomplete="current-password" placeholder="Sua senha" required>
    </div>
    <button class="o360-submit" type="submit">Entrar no Oficina 360</button>
    <p id="o360LoginStatus" class="o360-login-status" role="status" aria-live="polite"></p>
  `;

  const comandoLink=card.querySelector('a.btn');
  if(comandoLink){
    card.insertBefore(form,comandoLink);
    const divider=document.createElement('div');
    divider.className='o360-login-divider';
    divider.textContent='ou';
    card.insertBefore(divider,comandoLink);
    comandoLink.classList.remove('primary');
    comandoLink.classList.add('soft','o360-comando-link');
    comandoLink.textContent='Abrir pelo Comando 360';
  }else{
    card.appendChild(form);
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const status=form.querySelector('#o360LoginStatus');
    const button=form.querySelector('.o360-submit');
    const email=form.elements.email.value.trim();
    const password=form.elements.password.value;
    status.className='o360-login-status';
    status.textContent='';

    if(!window.supabase||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){
      status.classList.add('error');
      status.textContent='Configuração do sistema não carregou.';
      return;
    }

    button.disabled=true;
    button.textContent='Entrando...';
    try{
      const client=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error)throw error;
      if(!data?.session)throw new Error('A sessão não foi criada. Tente novamente.');
      status.classList.add('ok');
      status.textContent='Acesso liberado. Abrindo Oficina 360...';
      location.reload();
    }catch(err){
      console.error('Oficina 360: falha no login direto',err);
      status.classList.add('error');
      status.textContent=authMessage(err);
      button.disabled=false;
      button.textContent='Entrar no Oficina 360';
    }
  });
}

migrateComandoSession();
window.c360MigrateSessionToOficina=migrateComandoSession;
document.addEventListener('DOMContentLoaded',()=>{
  injectStandaloneStyles();
  renderStandaloneLogin();
},{once:true});
})();