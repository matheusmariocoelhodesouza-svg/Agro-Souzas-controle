(()=>{
'use strict';

const FARM_CACHE_VERSION='2026.09.12-f1';

async function warmAllPoultryFarmsOffline(){
  try{
    if(typeof deviceMode==='undefined'||!deviceMode||typeof c360NetOnline!=='function'||!c360NetOnline()||typeof companyId==='undefined'||!companyId)return;
    const teamId=typeof deviceAccess!=='undefined'?(deviceAccess?.team_id||null):null;
    if(!teamId||typeof rest!=='function'||typeof offlineCacheSet!=='function'||typeof offlineTeamKey!=='function')return;

    const [teams,loadings,farms] = await Promise.all([
      rest('v2_teams','select=id,name,status,metadata,supervisor_employee_id&company_id=eq.'+companyId+'&id=eq.'+encodeURIComponent(teamId)),
      rest('v2_poultry_loadings','select=id,farm_id,operation_id,metadata,team_id,status&company_id=eq.'+companyId+'&team_id=eq.'+encodeURIComponent(teamId)+'&order=created_at.desc&limit=200'),
      rest('v2_poultry_farms','select=id,integrator_id,producer_name,farm_name,city,address,status,metadata&company_id=eq.'+companyId+'&status=eq.active&order=producer_name.asc')
    ]);

    let barns=[];
    try{
      barns=await rest('v2_poultry_barns','select=id,farm_id,barn_number,outlet_type,energy_type,status&company_id=eq.'+companyId+'&status=eq.active&order=barn_number.asc')||[];
    }catch(_){barns=[]}

    const safeTeams=(teams||[]).length?teams:((typeof deviceTeam!=='undefined'&&deviceTeam)?[deviceTeam]:[]);
    const safeFarms=farms||[];
    const safeLoadings=loadings||[];

    await offlineCacheSet(offlineTeamKey('poultry_context'),{
      teams:safeTeams,
      farms:safeFarms,
      barns,
      loadings:safeLoadings,
      farm_cache_version:FARM_CACHE_VERSION,
      cached_at:new Date().toISOString()
    });

    try{
      poultryTeams=safeTeams;
      poultryFarms=safeFarms;
      poultryBarns=barns;
      poultryLoadings=safeLoadings;
      if(typeof populateSavedFarmOptions==='function')populateSavedFarmOptions();
    }catch(_){ }

    const [ops,trucks]=await Promise.all([
      rest('v2_operations','select=id,operation_number,title,customer_name,location_name,team_id,scheduled_start,scheduled_end,actual_start,actual_end,status,planned_birds,actual_birds,price_per_thousand,price_per_bird,actual_revenue,notes,offline_event_id,metadata&company_id=eq.'+companyId+'&operation_type=eq.poultry_catching&order=scheduled_start.desc&limit=100'),
      rest('v2_poultry_truck_loads','select=id,loading_id,truck_sequence,truck_plate,driver_name,birds,started_at,completed_at,is_cata,external_reference,metadata&company_id=eq.'+companyId+'&order=created_at.asc')
    ]);
    await offlineCacheSet(offlineTeamKey('poultry_ops'),{ops:ops||[],loadings:safeLoadings,trucks:trucks||[]});
  }catch(e){
    console.warn('Comando 360: falha ao atualizar catálogo completo de granjas offline',e);
  }
}

try{
  warmPoultryOfflineCache=warmAllPoultryFarmsOffline;
  window.warmPoultryOfflineCache=warmAllPoultryFarmsOffline;
}catch(e){console.warn('Comando 360: não foi possível substituir a pré-carga de granjas',e)}

async function refreshFarmCatalogNow(){
  try{
    if(typeof deviceMode==='undefined'||!deviceMode||typeof c360NetOnline!=='function'||!c360NetOnline())return false;
    await warmAllPoultryFarmsOffline();
    if(typeof loadDevicePoultryContext==='function')await loadDevicePoultryContext();
    return true;
  }catch(e){console.warn('Comando 360: atualização de granjas',e);return false}
}

window.addEventListener('online',()=>setTimeout(refreshFarmCatalogNow,500));
let attempts=0;
const bootTimer=setInterval(async()=>{
  attempts++;
  if(await refreshFarmCatalogNow())clearInterval(bootTimer);
  else if(attempts>=60)clearInterval(bootTimer);
},1000);

window.c360RefreshFarmCatalog=refreshFarmCatalogNow;
window.C360_FARM_CACHE_VERSION=FARM_CACHE_VERSION;
})();
