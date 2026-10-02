/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
const $app=document.getElementById("app"),$sheet=document.getElementById("sheet");
/* Geri tuşu: tarayıcı geçmişi, ekranın "derinliği" ile eşitlenir (sekme 1 + oturum 1 + panel 1).
   Geri: açık panel kapanır; aktif oturumda çıkış onayı sorulur; diğer sekmelerden ana sayfaya dönülür. */
let NAVD=0,popIgnore=0;
function hasHistory(){return typeof history!=="undefined"&&history&&typeof history.pushState==="function"&&typeof window!=="undefined"}
function navWant(){return(tab!=="home"?1:0)+(SS?1:0)+(sheet?1:0)}
function navSync(){
  if(!hasHistory())return;
  const want=navWant();
  if(want>NAVD){for(let i=NAVD;i<want;i++){try{history.pushState({yds:i+1},"")}catch(e){}}NAVD=want}
  else if(want<NAVD){const n=NAVD-want;NAVD=want;popIgnore+=n;try{history.go(-n)}catch(e){popIgnore-=n}}
}
function onPop(){
  if(popIgnore>0){popIgnore--;return}
  NAVD=Math.max(0,NAVD-1);
  if(sheet){sheet=null;renderSheet();return}
  if(SS){sheet={type:"confirm",what:"exit"};renderSheet();return}
  if(tab!=="home"){tab="home";render()}
}
if(hasHistory()&&window.addEventListener)window.addEventListener("popstate",onPop);
/* Hata ekranı: beyaz ekran yerine; kullanıcı verisine dokunmaz. */
function showFatal(err){
  logCritical("render error",err);
  let raw="";try{raw=STORE.get(KEY)||""}catch(e){}
  const msg=esc(String(err&&err.stack||err));
  try{$app.innerHTML=`<div class="stack fatal" role="alert"><h1 class="sumhead" style="font-size:24px">Uygulama açılırken bir sorun oluştu.</h1>
  <p class="muted">İlerlemen silinmedi; bu cihazda saklanmaya devam ediyor.</p>
  <button class="btn btn-primary" onclick="location.reload()">Tekrar Dene</button>
  <details><summary class="small">Yedeği Dışa Aktar</summary><p class="small muted">Metni kopyalayıp güvenli bir yere kaydet.</p><textarea readonly aria-label="Yedek metni">${esc(raw)}</textarea></details>
  <details><summary class="small">Ayrıntıları Gör</summary><pre class="small" style="white-space:pre-wrap">${msg}</pre></details></div>`;$sheet.innerHTML=""}catch(e){}
}
function applyTheme(){const r=document.documentElement;if(S.settings.theme==="system")r.removeAttribute("data-theme");else r.setAttribute("data-theme",S.settings.theme)}
function render(){
  try{
  applyTheme();
  let html;
  if(!SS&&needsOnboarding()&&tab==="home")html=vOnboard();else if(SS)html=vSession();else if(tab==="summary")html=vSummary();else if(tab==="words")html=vWords();else if(tab==="progress")html=vProgress();else if(tab==="study")html=vStudy();else if(tab==="settings")html=vSettings();else html=vHome();
  $app.innerHTML=html;renderSheet();
  document.querySelectorAll("#tabs .tab").forEach(b=>{if(b.dataset.v===tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});
  if(SS&&SS.ans!==null){const nb=document.getElementById("nextbtn");if(nb&&nb.focus)nb.focus({preventScroll:true})}
  }catch(e){showFatal(e)}
}
function renderSheet(){
  $sheet.innerHTML=vSheet();
  navSync();
}
function backupMsg(t){const el=document.getElementById("backupmsg");if(el)el.textContent=t}
function doImport(state){
  try{STORE.set(KEY+".undo",JSON.stringify(S))}catch(e){}
  S=state;REV++;save();flush();summary=null;
}
function undoImport(){
  try{const r=STORE.get(KEY+".undo");if(!r)return false;S=migrate(JSON.parse(r));REV++;save();flush();STORE.remove(KEY+".undo");return true}catch(e){return false}
}

