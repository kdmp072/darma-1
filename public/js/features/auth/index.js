/* ============================================================
   AUTH
============================================================ */
function doLogin(){
  const role=document.getElementById('lRole').value;
  const user=document.getElementById('lUser').value.trim();
  const pass=document.getElementById('lPass').value;
  const err=document.getElementById('lErr');
  err.style.display='none';
  if(!role||!user||!pass){err.style.display='block';err.textContent='❌ Lengkapi role, username, dan password.';return;}
  if(API.mode==='cloud'){
    err.style.display='block';err.textContent='⏳ Menghubungkan ke server...';
    API.login(user,pass).then(res=>{
      if(!res||!res.token||!res.user){err.textContent='❌ Username atau password salah.';return;}
      if(role&&res.user.role!==role){err.textContent='❌ Role tidak sesuai untuk akun ini.';return;}
      API.setToken(res.token);CU=res.user;err.style.display='none';
      API.probe().then(st=>{if(st&&st.units){DB.units=st.units;DB.monitoring=st.monitoring;}enterApp(true);});
    });
    return;
  }
  const u=DB.users.find(x=>x.username===user&&x.password===pass);
  if(!u||u.role!==role){err.style.display='block';err.textContent='❌ Role, username, atau password salah.';return;}
  CU=u;
  try{localStorage.setItem('simon_mbg_ses',u.username);}catch(e){}
  enterApp(true);
}
function enterApp(animate){
  window.dispatchEvent(new CustomEvent('darma:auth-changed'));
  document.getElementById('hName').textContent=CU.nama;
  document.getElementById('hRole').textContent=CU.role==='admin'?'Admin / Koordinator':'Petugas Monitoring';
  document.getElementById('loginOverlay').classList.add('hiding');
  document.getElementById('hdr').classList.add('visible');
  document.getElementById('sidebar').classList.add('visible');
  document.getElementById('mapCtrl').classList.add('visible');
  document.getElementById('legendBox').classList.add('visible');
  document.getElementById('cntBadge').classList.add('visible');
  document.getElementById('usrBtn').style.display=(CU.role==='admin')?'flex':'none';
  document.getElementById('dtDelBtn').style.display=(CU.role==='admin')?'':'none';
  renderAll();
  setTimeout(()=>map.invalidateSize(),400);
  if(animate)toast('👋 Selamat datang, '+CU.nama+'!');
}
function doLogout(){
  CU=null;window.dispatchEvent(new CustomEvent('darma:auth-changed'));try{localStorage.removeItem('simon_mbg_ses');}catch(e){}
  API.setToken('');
  document.getElementById('loginOverlay').classList.remove('hiding');
  document.getElementById('hdr').classList.remove('visible');
  document.getElementById('sidebar').classList.remove('visible');
  ['mapCtrl','legendBox','cntBadge'].forEach(id=>document.getElementById(id).classList.remove('visible'));
  document.getElementById('usrBtn').style.display='none';
  document.getElementById('lUser').value='';document.getElementById('lPass').value='';
}
function toggleTheme(){
  const h=document.documentElement;
  const d=h.getAttribute('data-theme')!=='dark';
  h.setAttribute('data-theme',d?'dark':'light');
  document.getElementById('themeBtn').innerHTML=d?'<i class="fas fa-sun"></i>':'<i class="fas fa-moon"></i>';
  localStorage.setItem('simon_mbg_theme',d?'dark':'light');
}
function applyThemeStorage(){
  const t=localStorage.getItem('simon_mbg_theme');
  if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');document.getElementById('themeBtn').innerHTML='<i class="fas fa-sun"></i>';}
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { doLogin, enterApp, doLogout, toggleTheme, applyThemeStorage });
