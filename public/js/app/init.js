/* ============================================================
   INIT
============================================================ */
window.addEventListener('DOMContentLoaded',async function(){
  const cloudUser=await loadDBAsync();
  initMap();
  initFilters();
  initRekamForm();
  initUnitForm();
  renderMap();
  fitAll();
  applyThemeStorage();
  updateModeBadge();
  // cek sesi
  if(API.mode==='cloud'){
    if(cloudUser){CU=cloudUser;enterApp(false);}
  }else{
    const ses=localStorage.getItem('simon_mbg_ses');if(ses){const u=DB.users.find(x=>x.username===ses);if(u){CU=u;enterApp(false);}}
  }
});

