/* ============================================================
   CONFIRM GENERIC
============================================================ */
function confirmDo(msg,fn){
  document.getElementById('confirmMsg').textContent=msg;
  pendingDel=fn;
  document.getElementById('confirmBtn').onclick=()=>{closeM('mConfirm');pendingDel&&pendingDel();};
  document.getElementById('mConfirm').classList.remove('hidden');
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { confirmDo });
