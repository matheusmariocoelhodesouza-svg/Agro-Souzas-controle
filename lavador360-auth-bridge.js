(()=>{
'use strict';
const PROJECT_REF='aycbrqziusxtxhsdfqjk';
const COMANDO_SESSION_KEY='controla_beta_session';
const SUPABASE_SESSION_KEY='sb-'+PROJECT_REF+'-auth-token';
const DIRECT_COPY='Entre diretamente no Lavador 360 com a mesma conta do ecossistema 360. Frota, oficina e dados continuam compartilhados automaticamente.';

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

migrateComandoSession();
window.c360MigrateSessionToLavador=migrateComandoSession;
document.addEventListener('DOMContentLoaded',renderStandaloneLogin,{once:true});
})();