/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= OLAYLAR ================= */
document.addEventListener("click",e=>{try{onClick(e)}catch(err){showFatal(err)}});
function onClick(e){
  const el=e.target.closest("[data-act]");if(!el)return;
  const a=el.dataset.act,v=el.dataset.v;
  if(a==="backdrop"){if(e.target===el){sheet=null;renderSheet()}return}
  switch(a){
    case"tab":{tab=v;sheet=null;render();window.scrollTo(0,0);break}
    case"start":startSession("daily");break;
    case"extra":startSession("extra");break;
    case"quick":startSession("quick");break;
    case"weak":startSession("weak");break;
    case"favstudy":startSession("fav");break;
    case"pairstudy":startSession("pair",+v);break;
    case"trap":startSession("trap");break;
    case"read":startSession("read");break;
    case"clz":startSession("clz");break;
    case"connstudy":startSession("conn",v||null);break;
    case"clusterstudy":startSession("cluster",v);break;
    case"ladderstudy":startSession("ladder",v);break;
    case"ladderopen":sheet={type:"ladder",id:v};renderSheet();break;
    case"place":startSession("place");break;
    case"orate":{const map={know:"good",unsure:"hard",dunno:"again",easy:"easy"};SS.self=v==="easy"?"know":v;rate(map[v]);break}
    case"ob":obStep(v);break;
    case"mockopen":sheet={type:"mock"};renderSheet();break;
    case"report30":sheet={type:"report30"};renderSheet();break;
    case"flagopen":sheet={type:"flag"};renderSheet();break;
    case"flagsave":{const it=cur();const note=(document.getElementById("flagnote")||{}).value||"";S.flags.push({q:it?qKey(it):"?",k:it&&it.k,reason:v,note:note.slice(0,200),d:today()});if(S.flags.length>300)S.flags.shift();SS.flagged=true;save();sheet=null;render();announce("Bildirim kaydedildi.");break}
    case"mocksave":{const g=id=>{const el=document.getElementById(id);const x=el&&el.value!==""?+el.value:null;return x==null||isNaN(x)?null:x};
      const tot=g("mk_t");if(tot==null||tot<0||tot>80){sheet.msg="Toplam doğru 0–80 arasında olmalı.";renderSheet();break}
      const pcts=["mk_v","mk_c","mk_s","mk_r"].map(g);if(pcts.some(x=>x!=null&&(x<0||x>100))){sheet.msg="Yüzdeler 0–100 arasında olmalı.";renderSheet();break}
      const dv=(document.getElementById("mk_d")||{}).value;const day=dv?Math.floor(Date.parse(dv)/86400000):today();
      S.mocks.push({d:day,total:tot,vocab:pcts[0],cloze:pcts[1],sc:pcts[2],reading:pcts[3]});save();sheet=null;render();announce("Deneme sonucu kaydedildi.");break}
    case"ydsopen":sheet={type:"yds"};render();break;
    case"ydsstart":startSession("yds",+v);break;
    case"pairsopen":sheet={type:"pairs"};renderSheet();break;
    case"clusters":sheet={type:"clusters"};renderSheet();break;
    case"cluster":sheet={type:"cluster",g:v};renderSheet();break;
    case"connopen":sheet={type:"conn"};renderSheet();break;
    case"weekly":sheet={type:"weekly"};S.weeklySeen=today();save();renderSheet();break;
    case"len":S.settings.length=v;save();render();break;
    case"nonew":S.noNewDay=S.noNewDay===today()?null:today();save();render();break;
    case"self":markReveal();SS.self=v;SS.stage="back";render();break;
    case"reveal":markReveal();SS.stage="back";render();break;
    case"rev":record(cur(),v==="1",null);next();break;
    case"rate":rate(v);break;
    case"famopen":SS.fam=true;render();break;
    case"ans":answer(+v);break;
    case"next":next();break;
    case"fav":{S.fav=isFav(v)?S.fav.filter(x=>x!==v):[...S.fav,v];save();render();break}
    case"queue":S.queue=S.queue.includes(v)?S.queue.filter(x=>x!==v):[...S.queue,v];save();renderSheet();break;
    case"exit":sheet={type:"confirm",what:"exit"};renderSheet();break;
    case"reset":sheet={type:"confirm",what:"reset"};renderSheet();break;
    case"confirm":if(sheet.what==="exit")exitSession();else{try{STORE.set(KEY+".undo",JSON.stringify(S))}catch(err){}S=blankState();REV++;save();flush();sheet=null;summary=null;tab="home";render()}break;
    case"close":sheet=null;renderSheet();break;
    case"detail":sheet={type:"detail",id:v};renderSheet();break;
    case"pair":sheet={type:"pair",i:+v};renderSheet();break;
    case"wf":wf=v;wlimit=120;render();break;
    case"more":wlimit+=150;render();break;
    case"npd":S.settings.newPerDay=+v;save();render();break;
    case"recall":S.settings.recall=v;save();render();break;
    case"theme":S.settings.theme=v;save();render();break;
    case"copybackup":{flush();const txt=exportText();
      const fail=()=>{sheet={type:"export",auto:true};renderSheet();const b=document.getElementById("exportbox");if(b){b.focus();b.select()}};
      try{navigator.clipboard.writeText(txt).then(()=>{backupMsg(`Yedek kopyalandı (${Math.round(txt.length/1024)} KB). Güvenli bir yere yapıştır.`);announce("Yedek kopyalandı.")},fail)}catch(err){fail()}break}
    case"import":sheet={type:"import"};renderSheet();break;
    case"export":flush();sheet={type:"export"};renderSheet();break;
    case"copybox":{const b=document.getElementById("exportbox");const txt=b?b.value:exportText();try{navigator.clipboard.writeText(txt).then(()=>announce("Yedek kopyalandı."),()=>{b.focus();b.select()})}catch(err){b.focus();b.select()}break}
    case"importcheck":{const txt=document.getElementById("importbox").value.trim();sheet.text=txt;
      if(!txt){sheet.msg="Önce yedek metnini yapıştır ya da bir dosya seç.";sheet.ok=false;renderSheet();break}
      try{sheet.pending=validateBackup(txt);sheet.msg="Yedek geçerli.";sheet.ok=true}catch(err){sheet.pending=null;sheet.msg=err.message+" Mevcut verin değişmedi.";sheet.ok=false}renderSheet();break}
    case"importconfirm":doImport(sheet.pending.state);sheet={type:"import",msg:"Yedek içe aktarıldı. Önceki durum geri alma için saklandı.",ok:true,undo:true};render();break;
    case"undoimport":{const ok=undoImport();sheet={type:"import",msg:ok?"İçe aktarma geri alındı.":"Geri alınacak kayıt bulunamadı.",ok};render();break}
    case"resume":if(!restoreSession()){discardSession();render()}break;
    case"discard":discardSession();render();break;
    case"install":{const I=typeof window!=="undefined"&&window.__ydsInstall;if(I&&I.canPrompt())I.prompt().then(()=>render());break}
  }
}
document.addEventListener("input",e=>{
  if(e.target.id==="wsearch"){wq=e.target.value;const q=wq.trim().toLocaleLowerCase("tr-TR");
    document.getElementById("wresults").innerHTML=vWordResults(q,WFILT[wf]||WFILT.all)}
});
document.addEventListener("change",e=>{
  if(e.target.id==="importfile"&&e.target.files&&e.target.files[0]){const r=new FileReader();r.onload=()=>{sheet.text=String(r.result);try{sheet.pending=validateBackup(sheet.text);sheet.msg="Dosya okundu, yedek geçerli.";sheet.ok=true}catch(err){sheet.pending=null;sheet.msg=err.message+" Mevcut verin değişmedi.";sheet.ok=false}renderSheet()};r.onerror=()=>{sheet.msg="Dosya okunamadı.";sheet.ok=false;renderSheet()};r.readAsText(e.target.files[0])}
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&sheet){sheet=null;renderSheet();return}
  if(!SS||sheet||e.metaKey||e.ctrlKey||e.altKey)return;
  const tag=(e.target.tagName||"").toLowerCase();if(tag==="input"||tag==="textarea")return;
  const it=cur();const k=e.key.toLowerCase();
  if(it.k==="flash"||it.k==="learn"||it.k==="connfo"){
    if(SS.stage==="front"){
      if(recallMode(it)==="open"){if(k===" "||k==="enter"){e.preventDefault();SS.stage="back";render()}}
      else{const m={"1":"know","2":"unsure","3":"dunno"};if(m[k]){e.preventDefault();SS.self=m[k];SS.stage="back";render()}}}
    else if(it.open){const m={"1":"dunno","2":"unsure","3":"know","4":"easy"};if(m[k]){e.preventDefault();const map={know:"good",unsure:"hard",dunno:"again",easy:"easy"};SS.self=m[k]==="easy"?"know":m[k];rate(map[m[k]])}}
    else{const m={"1":"again","2":"hard","3":"good","4":"easy"};if(m[k]){e.preventDefault();rate(m[k])}}
  }else if(it.k==="reverse"){
    if(SS.stage==="front"){if(k===" "||k==="enter"){e.preventDefault();SS.stage="back";render()}}
    else if(k==="1"||k==="2"){e.preventDefault();record(it,k==="2",null);next()}
  }else if(it.k==="pair"||it.k==="ladder"||it.k==="passage"||it.k==="leech"){if(k==="enter"||k===" "){e.preventDefault();next()}}
  else if(it.opts){
    if(SS.ans===null){let i="abcde".indexOf(k);if(i<0)i="12345".indexOf(k);if(i>=0&&i<it.opts.length){e.preventDefault();answer(i)}}
    else if(k==="enter"||k===" "){if(e.target&&e.target.id==="nextbtn")return;e.preventDefault();next()}
  }
});
if(typeof window!=="undefined"&&window.addEventListener){window.addEventListener("pagehide",flush);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){if(SS)SS.hid=true;flush()}})}
if(typeof window!=="undefined"){window.__ydsFlush=flush;window.__ydsRender=()=>{try{render()}catch(e){}}}
render();
