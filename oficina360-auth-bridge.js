(()=>{
'use strict';
const PROJECT_REF='aycbrqziusxtxhsdfqjk';
const COMANDO_SESSION_KEY='controla_beta_session';
const SUPABASE_SESSION_KEY='sb-'+PROJECT_REF+'-auth-token';

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

migrateComandoSession();
window.c360MigrateSessionToOficina=migrateComandoSession;
})();
