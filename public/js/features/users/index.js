import { getAppContext } from '../../core/context.js';

const userRepository = getAppContext().repositories.users;

/* ============================================================
   MANAJEMEN PENGGUNA (ADMIN)
============================================================ */
function openUsersModal(){resetUserForm();renderUsers();document.getElementById('mUsers').classList.remove('hidden');}
function resetUserForm(){setVal('uId','');setVal('uNama','');setVal('uUser','');setVal('uPass','');setVal('uRole','petugas');document.getElementById('uBtnTxt').textContent='Tambah Pengguna';}
async function renderUsers(){
  const el=document.getElementById('userList');
  if(API.mode==='cloud'){el.innerHTML='<div class="empty"><p>Memuat pengguna...</p></div>';const us=await API.getUsers();if(us)DB.users=us;}
  document.getElementById('uCount').textContent=DB.users.length;
  el.innerHTML=DB.users.map(u=>{
    const isAdmin=u.role==='admin';
    const canDel=u.id!==(CU&&CU.id)&&!(isAdmin&&DB.users.filter(x=>x.role==='admin').length<=1);
    const mine=u.id===(CU&&CU.id);
    return `<div class="hcard" style="margin-bottom:7px">
      <div class="hc-top">
        <div class="kbadge" style="background:${isAdmin?'#7c3aed':'var(--sppg)'};box-shadow:none">${isAdmin?'A':'P'}</div>
        <div class="hc-name">${esc(u.nama)} <small style="font-weight:600;color:var(--text3)">(@${esc(u.username)})${mine?' · Anda':''}</small></div>
        <div class="kchip" style="background:${isAdmin?'#ede9fe':'#dbeafe'};color:${isAdmin?'#6d28d9':'#1e40af'}">${isAdmin?'Admin':'Petugas'}</div>
      </div>
      <div style="font-size:9.5px;color:var(--text3);margin-top:2px">🔑 Password: <b style="color:var(--text2)">${esc(u.password)}</b></div>
      <div class="hc-actions" style="margin-top:6px">
        <button class="btn bx bsm" onclick="editUserForm('${u.id}')"><i class="fas fa-edit"></i> Edit</button>
        ${canDel?`<button class="btn bd bsm" onclick="delUser('${u.id}')"><i class="fas fa-trash"></i> Hapus</button>`:'<span class="fhint">(admin terakhir / akun sendiri)</span>'}
      </div>
    </div>`;
  }).join('');
}
function saveUserForm(){
  const id=getVal('uId'),nama=getVal('uNama'),user=getVal('uUser'),pass=getVal('uPass'),role=getVal('uRole');
  if(!nama||!user||!pass){toast('Lengkapi nama, username, dan password','e');return;}
  if(DB.users.find(x=>x.username.toLowerCase()===user.toLowerCase()&&x.id!==id)){toast('Username sudah dipakai akun lain','e');return;}
  const saved=id?Object.assign({},userRepository.getAll().find(x=>x.id===id),{nama,username:user,password:pass,role}):{id:uid('usr'),nama,username:user,password:pass,role};
  userRepository.save(saved);toast(id?'✅ Pengguna "'+nama+'" diperbarui':'✅ Pengguna "'+nama+'" ditambahkan');
  resetUserForm();renderUsers();
}
function editUserForm(id){const u=DB.users.find(x=>x.id===id);if(!u)return;setVal('uId',u.id);setVal('uNama',u.nama);setVal('uUser',u.username);setVal('uPass',u.password);setVal('uRole',u.role);document.getElementById('uBtnTxt').textContent='Simpan Perubahan';}
function delUser(id){
  const u=DB.users.find(x=>x.id===id);if(!u)return;
  if(u.id===CU.id){toast('Tidak bisa menghapus akun sendiri','e');return;}
  if(u.role==='admin'&&DB.users.filter(x=>x.role==='admin').length<=1){toast('Minimal harus ada 1 admin','e');return;}
  confirmDo('Hapus pengguna "'+u.nama+'"? Login dengan akun ini tidak akan bisa lagi.',()=>{
    userRepository.remove(id);renderUsers();toast('🗑️ Pengguna dihapus');
  });
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { openUsersModal, resetUserForm, renderUsers, saveUserForm, editUserForm, delUser });
