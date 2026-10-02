/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= OTURUM ================= */
function newSession(mode,extra){return Object.assign({mode,phases:[],pi:0,ii:0,stage:"front",ans:null,self:null,fam:false,newIds:[],revIds:[],studied:[],q:0,c:0,hard:new Set(),again:new Set(),pen:new Set(),pairHit:new Set(),rq:{},sk:{},mastered:0,t0:Date.now(),ydsT:{},ydsWrong:new Set(),ydsLog:[],selfPending:null,knowIds:[],dqSkipped:0,revRec:{n:0,ok:0},deferred:0,ctx0:S.ctxLevel},extra||{})}
function addPhase(key,label,items,dyn){if(items.length||dyn)SS.phases.push({key,label,items,dyn:!!dyn})}
function connItems(id){const w=BY[id];const out=[{k:"connfo",id}];["cstruct","cfunc","cid","cpunct"].forEach(k=>{if(available(k,w))out.push({k,id})});if(available("cloze",w))out.push({k:"cloze",id});return out}
function trapItem(t){return{k:"trap",t,opts:t.o.map((x,i)=>({t:x,ok:i===t.a}))}}
function clozeItems(c){return c.blanks.map((b,i)=>({k:"clz",cz:c,bi:i,opts:shuffle(b.o.map((t,j)=>({t,ok:j===b.a})))}))}
/* Okuma köprüsü hedef seti: zayıf (3), son 3 günde öğrenilen (2), unutulmaya yakın kalıcı (2), tanıdık (1) */
const READ_LEVELS=["easy","intermediate","yds"],READ_LABEL={easy:"Kolay",intermediate:"Orta",yds:"YDS"};
function targetWeights(){
  const t=today(),sm=statusMap(),o={};
  for(const id in S.cards){if(!BY[id])continue;const c=S.cards[id],st=sm[id];let v=0;
    if(st==="weak"||transferGap(id))v=3;else if(c.first>=t-3)v=2;else if(c.first>=t-7)v=2;else if(st==="mastered"&&(c.due<=t+1||retr(c,t)<.7))v=2;else if(st==="familiar")v=1;
    if(v)o[id]=v}
  return o;
}
function textScore(words){const tw=targetWeights();return words.reduce((a,id)=>a+(tw[id]||0),0)}
function pickByLevel(list,doneMap,level){
  const t=today();
  let pool=list.filter(x=>doneMap[x.id]==null||t-doneMap[x.id]>=7);         // son 7 günde gösterilen tekrar gelmez
  if(!pool.length)pool=list.slice().sort((a,b)=>(doneMap[a.id]??-1)-(doneMap[b.id]??-1)).slice(0,3);
  const want=READ_LEVELS[level];
  const order=[want,READ_LEVELS[level-1],READ_LEVELS[level+1]].filter(Boolean);
  for(const lv of order){const c=pool.filter(x=>x.difficulty===lv);if(c.length){const tw=targetWeights();
    return c.map(x=>({x,s:x.words.reduce((a,id)=>a+(tw[id]||0),0)+Math.random()*.5})).sort((a,b)=>b.s-a.s)[0].x}}
  return pool[0];
}
function pickPassage(){return pickByLevel(PASSAGES,S.readDone,S.readLevel)}
function pickCloze(){return pickByLevel(CLOZES,S.clozeDone,S.readLevel)}
/* Okuma zorluğu: son 20 okuma sorusu; en az 12 cevap ve 2 oturum olmadan seviye değişmez. */
function readAdjust(){
  S.readSess++;
  if(S.readHist.length<12||S.readSess<2)return null;
  const a=S.readHist.reduce((x,y)=>x+y,0)/S.readHist.length;let ch=null;
  if(a>=.8&&S.readLevel<2){S.readLevel++;ch="up"}else if(a<.55&&S.readLevel>0){S.readLevel--;ch="down"}
  if(ch){S.readSess=0;S.readHist=[]}
  return ch;
}
function startSession(mode,arg){
  if(mode==="yds"){
    SS=newSession("yds",{ydsN:arg});
    addPhase("yds","Mini YDS",ydsSet(arg));
  }else if(mode==="pair"){
    const p=PAIRS[arg];SS=newSession("pair",{pair:arg,studied:p.ws.slice()});
    addPhase("compare","Karşılaştır",[{k:"pair",p}]);
    const items=[];p.ws.forEach(id=>{items.push({k:"pairq",id,p});items.push({k:"mean",id})});
    TRAPS.filter(t=>t.pair.split("/").some(x=>p.ws.includes(x))).slice(0,3).forEach(t=>items.push(trapItem(t)));
    addPhase("test","Mini test",shuffle(items));
  }else if(mode==="quick"){
    const t=today();const due=dueList().sort((a,b)=>recallProbability(a,t)-recallProbability(b,t)).slice(0,30);
    if(!due.length)return;
    SS=newSession("quick",{revIds:due,studied:due.slice()});
    addPhase("review","Hızlı tekrar",due.map(id=>({k:"flash",id})));
    addPhase("mini","Kısa test",[],true);
  }else if(mode==="weak"){
    const ws=weakList().slice(0,8);if(!ws.length)return;
    SS=newSession("weak",{revIds:ws,studied:ws.slice()});
    const lw=ws.filter(id=>wordTags(id).has("Leech")).slice(0,2);
    if(lw.length)addPhase("leech","Farklı yöntem",lw.flatMap(id=>[{k:"leech",id},{k:"mean",id},{k:ctxPick(id)||"mean",id}]));
    const pairs=PAIRS.filter(p=>p.ws.some(w=>ws.includes(w))).slice(0,2);
    const items=[];
    ws.forEach(id=>{const c=S.cards[id];if(c&&c.wrong>=3)items.push(...drill(id));else{items.push({k:"flash",id});kindsFor(id).filter(k=>k!=="mean").slice(0,2).forEach(k=>items.push({k,id}))}});
    if(pairs.length)addPhase("pairs","Karıştırılan kelimeler",pairs.map(p=>({k:"pair",p})));
    addPhase("weak","Zayıf kelimeler",items);
  }else if(mode==="fav"){
    const fs=S.fav.filter(id=>BY[id]).slice(0,20);if(!fs.length)return;
    SS=newSession("fav",{revIds:fs.filter(id=>S.cards[id]),newIds:fs.filter(id=>!S.cards[id]),studied:fs.slice()});
    addPhase("fav","Favoriler",fs.map(id=>({k:S.cards[id]?"flash":"learn",id})));
    addPhase("favq","Bağlam ve bağlantı",fs.map(id=>({k:kindsFor(id)[0]||"mean",id})));
  }else if(mode==="conn"){
    const L=W.filter(w=>isLink(w)&&w.cn&&!CONN_SKIP.has(w.id));
    let ids=arg?L.filter(w=>w.g===arg).map(w=>w.id):[];
    if(!ids.length){const known=L.filter(w=>S.cards[w.id]).sort((a,b)=>masteryScore(a.id)-masteryScore(b.id)).map(w=>w.id);const fresh=L.filter(w=>!S.cards[w.id]).sort((a,b)=>b.p-a.p).map(w=>w.id);ids=[...known.slice(0,4),...fresh].slice(0,6)}
    ids=ids.slice(0,8);
    SS=newSession("conn",{studied:ids.slice(),newIds:ids.filter(id=>!S.cards[id]),revIds:ids.filter(id=>S.cards[id])});
    addPhase("cinfo","Bağlaç kartları",ids.map(id=>({k:"connfo",id})));
    const qs=[];ids.forEach(id=>connItems(id).slice(1).forEach(x=>qs.push(x)));
    TRAPS.filter(t=>/although|because/.test(t.pair)).forEach(t=>qs.push(trapItem(t)));
    addPhase("cq","Yapı ve işlev testi",shuffle(qs));
  }else if(mode==="place"){
    // Seviyemi ölç: 18 soru (6 temel, 6 orta, 6 ileri); kart oluşturmaz
    const band=f=>shuffle(W.filter(w=>!isLink(w)&&!w.sv&&f(w.l))).slice(0,6).map(id=>({k:"place",id:id.id,band:f===B1?"core":f===B2?"inter":"adv"}));
    const B1=l=>l<=2,B2=l=>l===3,B3=l=>l>=4;
    SS=newSession("place",{place:{core:{c:0,n:0},inter:{c:0,n:0},adv:{c:0,n:0}},placeOk:[]});
    addPhase("place","Seviyemi ölç",[...band(B1),...band(B2),...band(B3)]);
  }else if(mode==="trap"){
    SS=newSession("trap");
    addPhase("trap","Kelime tuzağı",shuffle(TRAPS).slice(0,12).map(trapItem));
  }else if(mode==="cluster"){
    const g=arg;const ws=W.filter(w=>w.g===g).sort((a,b)=>a.l-b.l||b.p-a.p);
    const pick=[...ws.filter(w=>S.cards[w.id]),...ws.filter(w=>!S.cards[w.id])].slice(0,8).map(w=>w.id);
    SS=newSession("cluster",{cluster:g,studied:pick.slice(),newIds:pick.filter(id=>!S.cards[id]),revIds:pick.filter(id=>S.cards[id])});
    addPhase("ladder","Eş anlam merdiveni",[{k:"ladder",g,ids:pick}]);
    addPhase("cards","Kelimeler",pick.map(id=>({k:S.cards[id]?"flash":"learn",id})));
    addPhase("cq","Kullanım farkı",shuffle(pick.flatMap(id=>[available("syn",BY[id])?{k:"syn",id}:null,{k:ctxPick(id)||"mean",id}]).filter(Boolean)));
  }else if(mode==="ladder"){
    const L=LADDERS.find(x=>x.id===arg);if(!L)return;
    const pick=ladderWords(L).filter(id=>BY[id]).slice(0,8);
    SS=newSession("cluster",{cluster:null,ladder:L.id,studied:pick.slice(),newIds:pick.filter(id=>!S.cards[id]),revIds:pick.filter(id=>S.cards[id])});
    addPhase("ladder","Anlam merdiveni",[{k:"ladder",L}]);
    addPhase("cards","Kelimeler",pick.map(id=>({k:S.cards[id]?"flash":"learn",id})));
    addPhase("cq","Kullanım farkı",shuffle(pick.flatMap(id=>[available("syn",BY[id])?{k:"syn",id}:null,{k:ctxPick(id)||"mean",id}]).filter(Boolean)));
  }else if(mode==="read"){
    const p=arg?PBY[arg]:pickPassage();if(!p)return;
    SS=newSession("read",{pid:p.id,studied:p.words.filter(id=>S.cards[id]),readLv0:S.readLevel});
    const qs=RD.map((b,i)=>({b,i})).filter(x=>x.b.p===p.id).map(x=>Object.assign({k:"rdq"},bankItem(x.b,"r"+x.i)));
    addPhase("passage","Okuma köprüsü",[{k:"passage",p},...qs]);
  }else if(mode==="clz"){
    const c=arg?CLOZES.find(x=>x.id===arg):pickCloze();if(!c)return;
    SS=newSession("clz",{czid:c.id,studied:c.words.filter(id=>S.cards[id]),readLv0:S.readLevel});
    addPhase("clz","Cloze köprüsü",clozeItems(c));
  }else{
    const p=planRaw(mode);const rev=[...p.weak,...p.review,...p.early];
    if(!rev.length&&!p.newIds.length)return;
    // Kapasiteyi aşan tekrarlar sonraki günlere yayılır (en iyi hatırlananlar ertelenir)
    let deferred=0;
    if(mode==="daily"&&p.overflow.length){const map=spreadOverflow(p.overflow,p.review.length);for(const id in map){S.cards[id].due=map[id];deferred++}S.deferred=deferred}
    SS=newSession(mode,{newIds:p.newIds,revIds:rev,studied:[...new Set([...rev,...p.newIds])],weakSet:new Set(p.weak),deferred,plan:p});
    const flash=rev.map(id=>({k:"flash",id,early:p.early.includes(id)}));
    // Ters hatırlama: günlük maddelerin en fazla %12'si; zamanlamayı değiştirmez
    const est=flash.length+p.newIds.length*3+p.weak.length*2+p.synN+p.ctxN+p.confN+p.cfg.mini;
    const revN=Math.min(Math.floor(est*.12),p.review.filter(id=>S.cards[id].step>=1).length);
    const revItems=shuffle(p.review.filter(id=>S.cards[id].step>=1)).slice(0,revN).map(id=>({k:"reverse",id}));
    // Recall Gap: kartta söyleyemiyor ama soruda tanıyor → açık hatırlama + ters hatırlama ile pekiştir
    const rg=rev.filter(id=>wordTags(id).has("RecallGap")).slice(0,5);
    flash.forEach(x=>{if(rg.includes(x.id))x.open=true});
    rg.filter(id=>!revItems.some(x=>x.id===id)).forEach(id=>revItems.push({k:"reverse",id,gap:true}));
    const mixed=flash.slice();revItems.forEach((x,i)=>mixed.splice(Math.min(mixed.length,(i+1)*Math.ceil(mixed.length/(revItems.length+1))+i),0,x));
    addPhase("review","Hızlı tekrar",mixed);
    const wq=[];p.weak.forEach(id=>{const ks=kindsFor(id).filter(k=>k!=="mean").slice(0,2);ks.forEach(k=>wq.push({k,id}));
      if(S.cards[id].relearn&&available("cloze",BY[id]))wq.push({k:"cloze",id,relearn:true})});   // unutulan kalıcı: ek bağlam
    // Recognition Gap: kartta tanıyor ama soruda kaçırıyor → flashcard değil bağlam ağırlığı
    rev.filter(id=>transferGap(id)).slice(0,6).forEach(id=>{const k=ctxPick(id);if(k)wq.push({k,id,gap:true})});
    // Leech: çok tekrar, düşük ustalık → farklı yöntem (özel kart + kısa test), 3 günde bir
    const t=today(),lee=rev.filter(id=>wordTags(id).has("Leech")&&(S.cards[id].leechShown==null||t-S.cards[id].leechShown>=3)).slice(0,2);
    const leeItems=lee.flatMap(id=>[{k:"leech",id},{k:"mean",id},{k:ctxPick(id)||"mean",id}]);
    addPhase("weak","Zayıf kelimeler",[...leeItems,...shuffle(wq)]);
    addPhase("learn","Yeni kelimeler",p.newIds.map(id=>({k:"learn",id})));
    // Kırılgan kalıcı: kalıcı olduktan 7+ gün sonra bir bağlam kontrolü; sürpriz kontrol: 30/60/90. gün civarı (yoğun günlerde yok)
    const fr=Object.keys(S.cards).filter(id=>BY[id]&&wordTags(id).has("FragileMastered")&&t-S.cards[id].masteredOn>=7&&!rev.includes(id)).slice(0,3);
    const sp=p.load==="heavy"?[]:surpriseCandidates(t).slice(0,2);
    SS.extraMini=[...fr.map(id=>({k:ctxPick(id)||"mean",id,fragile:true})),...sp.map(x=>({k:ctxPick(x.id)||"mean",id:x.id,surprise:x.m})),...(p.dtc||[]).map(id=>({k:ctxPick(id)||"mean",id,delayed:true}))];
    SS.studied=[...new Set([...SS.studied,...fr,...sp.map(x=>x.id),...(p.dtc||[])])];
    const revS=shuffle(p.review.concat(p.early));
    addPhase("syn","Eş anlam testi",shuffle([...p.newIds,...revS.filter(id=>available("syn",BY[id])).slice(0,p.synN)].filter(id=>available("syn",BY[id]))).map(id=>({k:"syn",id})));
    SS.ctxRev=revS.filter(id=>!SS.phases.find(ph=>ph.key==="syn"&&ph.items.some(x=>x.id===id))).slice(0,p.ctxN);
    addPhase("ctx","Cümle içinde",[],true);
    SS.confN=p.confN;
    addPhase("conf","Karıştırılan kelimeler",[],true);
    addPhase("hard","Günün zor kelimeleri",[],true);
    addPhase("mini","Kısa karışık test",[],true);
  }
  SS.sid=Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36);SS.acts=0;
  SS.planned=SS.phases.reduce((a,ph)=>a+ph.items.length,0);
  S.sessLog.push({sid:SS.sid,d:today(),mode,len:S.settings.length,planned:SS.planned,done:0,ok:false,alg:ALG});if(S.sessLog.length>80)S.sessLog.shift();
  logEv("sessionStarted",{qt:mode});
  document.body.classList.add("in-session");sheet=null;
  enterPhase();if(typeof window!=="undefined")window.scrollTo(0,0);
}
function buildDynamic(ph){
  if(ph.key==="ctx"){
    const ids=[...SS.newIds,...(SS.ctxRev||[])];
    // Öz değerlendirme doğrulaması: “Biliyorum” dediğin kelimelerden bazıları bağlamda sorulur
    const verify=SS.knowIds.filter(id=>!ids.includes(id)).slice(0,4);
    ph.items=[...ids.map(id=>({k:ctxPick(id)||"mean",id})),...verify.map(id=>({k:ctxPick(id)||"mean",id,verify:true}))];
    ph.items=shuffle(ph.items);
  }else if(ph.key==="conf"){
    const st=new Set(SS.studied);const items=[];
    const pairs=PAIRS.filter(p=>p.ws.some(w=>st.has(w)&&S.cards[w])).slice(0,Math.max(0,SS.confN||0));
    pairs.forEach(p=>{const id=p.ws.find(w=>st.has(w));if(available("pairq",BY[id]))items.push({k:"pairq",id,p})});
    const confd=Object.keys(S.conf).filter(id=>st.has(id)&&BY[id]);
    confd.slice(0,2).forEach(id=>{const p=PAIRS.find(pp=>pp.ws.includes(id));if(p&&!items.some(x=>x.id===id))items.push({k:"pairq",id,p})});
    const traps=TRAPS.filter(t=>t.pair.split("/").some(x=>st.has(x)));
    shuffle(traps).slice(0,Math.max(0,(SS.confN||0)-items.length)).forEach(t=>items.push(trapItem(t)));
    // Kişisel karıştırma çiftleri (gerçek hatalardan): karşılaştırma kartı + soru
    personalPairs().filter(p=>p.ws.some(w=>st.has(w))).slice(0,2).forEach(p=>{items.unshift({k:"pair",p});const id=p.ws.find(w=>st.has(w));if(available("pairq",BY[id]))items.push({k:"pairq",id,p})});
    ph.items=items;
  }else if(ph.key==="hard"){
    const hard=[...SS.hard];
    const pairs=PAIRS.filter(p=>p.ws.some(w=>SS.pairHit.has(w))||(p.ws.some(w=>SS.hard.has(w))&&p.ws.every(w=>S.cards[w]))).slice(0,2);
    const items=pairs.map(p=>({k:"pair",p}));let drills=0;
    for(const id of hard.slice(0,10)){if(!BY[id])continue;const c=S.cards[id];if(c&&c.wrong>=3&&drills<3){items.push(...drill(id));drills++}else items.push({k:"flash",id,hard:true})}
    ph.items=items;
  }else if(ph.key==="mini"){
    const pool=shuffle(SS.studied.filter(id=>BY[id]));if(!pool.length){ph.items=[];return}
    const cfg=LEN[S.settings.length]||LEN.normal;const n=SS.mode==="quick"?3:Math.min(cfg.mini,Math.max(3,pool.length*2));
    const base=["mean","ctx","syn","coll","ctx","fam"];const ws=weakestSkill();
    const prefer=ws?{mean:"mean",syn:"syn",ctx:"ctx",coll:"coll",fam:"fam",conf:"ctx"}[ws.k]:null;
    ph.items=[];
    for(let i=0;i<n;i++){const id=pool[i%pool.length];let k=(prefer&&i%3===2)?prefer:base[i%base.length];if(k==="ctx")k=ctxPick(id)||"mean";if(!available(k,BY[id]))k=ctxPick(id)||"mean";ph.items.push({k,id})}
    if(SS.extraMini)ph.items.push(...SS.extraMini);
  }
}
function enterPhase(){
  while(SS.pi<SS.phases.length){const ph=SS.phases[SS.pi];if(ph.dyn)buildDynamic(ph);
    if(ph.items.length){SS.ii=0;if(prepare())return render();continue}SS.pi++}
  finish();
}
const cur=()=>SS.phases[SS.pi].items[SS.ii];
/* Hazırla: kalitesiz soru gösterilmez; önce “anlam” sorusuna düşer, o da kalitesizse atlanır. */
function prepare(){
  for(;;){
    const ph=SS.phases[SS.pi];
    if(SS.ii>=ph.items.length){SS.pi++;if(SS.pi>=SS.phases.length)return false;const np=SS.phases[SS.pi];if(np.dyn)buildDynamic(np);SS.ii=0;continue}
    SS.stage="front";SS.ans=null;SS.self=null;SS.fam=false;SS.t0i=Date.now();SS.hid=false;SS.trev=null;
    const it=cur();
    if(it.k==="learn"&&!it.again&&!it.logged){it.logged=true;logEv("wordShown",{w:it.id,d:BY[it.id]&&BY[it.id].l})}
    if(it.k==="flash"&&it.open==null&&wordTags(it.id).has("RecallGap"))it.open=true;
    if((it.k==="flash"||it.k==="learn"||it.k==="connfo")&&it.open==null){
      // Açık hatırlama: ayara göre; butonlu modda bile her 4. tekrar kartı açık hatırlama ister
      const m=S.settings.recall,c=S.cards[it.id];SS.fc=(SS.fc||0)+1;
      it.open=m==="open"||(it.k==="flash"&&(m==="auto"?(c&&c.step>=2)||SS.fc%4===0:SS.fc%4===0));
    }
    if(OPTK.includes(it.k)){
      if(!it.id||!BY[it.id]||!available(it.k,BY[it.id])){it.k="mean"}
      it.opts=buildOpts(it);
      if(it.dq<.6&&it.k!=="mean"){it.k="mean";it.opts=buildOpts(it)}
      if(it.dq<.6){SS.dqSkipped++;SS.ii++;continue}
    }
    return true;
  }
}
function trackCtx(ok){
  S.ctxRecent.push(ok?1:0);if(S.ctxRecent.length>10)S.ctxRecent.shift();
  if(S.ctxRecent.length>=10){const a=S.ctxRecent.reduce((x,y)=>x+y,0)/S.ctxRecent.length;
    if(a>=.8&&S.ctxLevel<3){S.ctxLevel++;S.ctxRecent=[]}else if(a<=.5&&S.ctxLevel>1){S.ctxLevel--;S.ctxRecent=[]}}
}
function record(it,ok,picked){
  SS.q++;if(ok)SS.c++;SS.acts=(SS.acts||0)+1;
  if(it.k==="place"){const b=SS.place[it.band];b.n++;if(ok){b.c++;SS.placeOk.push(it.id)}return}   // yerleştirme: istatistiklere ve kartlara dokunmaz
  const d=dayRec();d.q++;if(ok)d.c++;
  if(it.k==="yds"||it.k==="rdq"){bump(SS.ydsT,it.yt,ok);if(!ok)it.words.forEach(id=>SS.ydsWrong.add(id));
    if(it.bank){const q=S.qstats[it.bank]||(S.qstats[it.bank]={n:0,last:null,c:0,w:0,lastOk:null});q.n++;q.last=today();q[ok?"c":"w"]++;q.lastOk=ok}
    if(it.yt==="rd"){S.readHist.push(ok?1:0);if(S.readHist.length>20)S.readHist.shift();bump(d,"rd",ok)}
    // Aktarım: okuma / Mini YDS kelime sorularındaki kelimeler; 3–7 gün önce öğrenilenler ayrıca izlenir
    const key=it.yt==="rd"?"read":it.yt==="vocab"?"yv":null,tt=today();
    if(key)for(const wid of it.words){const c=S.cards[wid];if(!c)continue;c.tr=c.tr||{};bump(c.tr,key,ok);
      if(key==="read"&&c.first<=tt-3&&c.first>=tt-7){S.transfer37.n++;if(ok)S.transfer37.ok++}
      if(key==="read"&&S.qstats[it.bank]&&S.qstats[it.bank].n===1){const age=tt-c.first;if(age<=1){bump(c,"trI",ok);bump(S,"immediate",ok)}else if(age>=3&&age<=7){bump(c,"trD",ok);bump(S,"delayed",ok)}}
      if(key==="read")fragileCheck(c,ok)}}
  if(it.k==="trap"){bump(S,"trapStats",ok);bump(S.err,"conf",ok);bump(SS.sk,"conf",ok);bump(d.sk,"conf",ok);
    it.t.pair.split("/").forEach(x=>{const c=S.cards[x];if(c){bump(c.sk,"conf",ok);if(!ok)c.confErr=(c.confErr||0)+1}});return save()}
  if(it.k==="clz"){bump(SS.sk,"ctx",ok);bump(d.sk,"ctx",ok);S.readHist.push(ok?1:0);if(S.readHist.length>20)S.readHist.shift();bump(d,"rd",ok);bump(d,"cz",ok);
    const wid=it.cz.blanks[it.bi].o[it.cz.blanks[it.bi].a],c=S.cards[wid];if(c){c.tr=c.tr||{};bump(c.tr,"clz",ok);
      if(S.clozeDone[it.cz.id]==null){const age=today()-c.first;if(age<=1){bump(c,"trI",ok);bump(S,"immediate",ok)}else if(age>=3&&age<=7){bump(c,"trD",ok);bump(S,"delayed",ok)}}}return save()}
  const id=it.id;if(!id||!BY[id])return save();
  const skill=KIND_SKILL[it.k]||"ctx";
  bump(SS.sk,skill,ok);bump(d.sk,skill,ok);
  // “Biliyorum” iddiası, aynı kelimenin oturumdaki bir sonraki sorusuyla doğrulanır
  if(SS.claim&&SS.claim[id]&&it.k!=="reverse"){delete SS.claim[id];S.self.verify.n++;if(ok)S.self.verify.ok++;if(skill==="ctx"){S.self.knowCtx.n++;if(ok)S.self.knowCtx.ok++}}
  const c=S.cards[id];if(!c){save();return}
  const w=BY[id];
  const t0=today();if(it.k!=="reverse"&&c.reps>0&&c.lastRev!=null&&c.lastRev<t0){calibAdd(recallProbability(id,t0),ok);retrievalObs(c,ok,t0,true)}
  delayedTransfer(c,it,ok,t0,skill);
  if(skill==="ctx")fragileCheck(c,ok);
  if(it.surprise){c.surpr=c.surpr||[];c.surpr.push(it.surprise);S.surpriseStats.n++;if(ok)S.surpriseStats.ok++;bump(S.mastCheck,String(it.surprise),ok)}
  if(skill==="ctx"&&it.k!=="yds"&&it.k!=="rdq")trackCtx(ok);
  markSeen(id,it.k,it);
  bump(S.err,skill,ok);bump(S.grp,w.g,ok);bump(c.sk,skill,ok);bump(d.g,w.g,ok);
  if(isLink(w)&&CM_KIND[it.k]){c.cm=c.cm||{};bump(c.cm,CM_KIND[it.k],ok);bump(S.connDim,CM_KIND[it.k],ok)}
  hardTrack(c,ok);
  if(it.k==="reverse"){SS.revRec.n++;if(ok)SS.revRec.ok++;REV++;return save()}   // ters hatırlama programı değiştirmez
  c.hist.push(ok?1:0);if(c.hist.length>10)c.hist.shift();
  quizStab(c,ok);
  if(ok){c.correct++;addCorrectDay(c)}else{
    c.wrong++;SS.hard.add(id);
    const t=today();
    if(c.first===t){c.step=Math.min(c.step,1);c.due=t+1}
    else if(!SS.pen.has(id)){c.step=Math.max(1,c.step-1);c.due=Math.min(c.due,t+1);SS.pen.add(id)}
    if(picked&&picked!==id){
      S.conf[id]=S.conf[id]||{};S.conf[id][picked]=(S.conf[id][picked]||0)+1;
      if(skill!=="conf"&&(w.cw.includes(picked)||PAIRMAP[pairKey(id,picked)])){c.confErr=(c.confErr||0)+1;bump(c.sk,"conf",false);bump(S.err,"conf",false);SS.pairHit.add(id);SS.pairHit.add(picked)}else if(skill==="conf"){c.confErr=(c.confErr||0)+1}
    }
  }
  checkMastery(id);save();
}
function answer(i){
  const it=cur();if(SS.ans!==null||!it.opts||i>=it.opts.length)return;
  SS.ans=i;const o=it.opts[i];
  const rt=validRt(Date.now()-SS.t0i,SS.hid);
  record(it,o.ok,o.wid);
  if(o.ok&&it.id&&S.cards[it.id]&&!it.bank)noteRt(S.cards[it.id],rt);
  if(!o.ok){const qk=qKey(it);const wp=S.wrongPicks[qk]||(S.wrongPicks[qk]={pick:null,n:0,rep:0});if(wp.pick===o.t)wp.rep++;wp.pick=o.t;wp.n++;
    const ks=Object.keys(S.wrongPicks);if(ks.length>600)delete S.wrongPicks[ks[0]]}
  logEv(o.ok?"questionCorrect":"questionWrong",{w:it.id||null,q:it.bank||null,qt:it.k==="yds"||it.k==="rdq"?it.yt:it.k,rt,d:it.k==="rdq"||it.yt==="rd"?S.readLevel:KIND_SKILL[it.k]==="ctx"?S.ctxLevel:(it.id&&BY[it.id]?BY[it.id].l:null),r:o.ok?1:0});
  if(it.k==="yds"){const a=it.opts.findIndex(x=>x.ok);SS.ydsLog.push({yt:it.yt,q:it.stemText,pid:it.pid,o:it.opts.map(x=>x.t),ow:it.opts.map(x=>x.ow||""),picked:i,a,why:it.why,key:it.key,gram:it.gram,ok:o.ok})}
  if(typeof announce==="function")announce(o.ok?"Doğru.":"Yanlış. Doğru cevap: "+it.opts.find(x=>x.ok).t);
  render();
}
/* Öz değerlendirme: Biliyorum / Emin değilim / Bilmiyorum seçimi, sonraki puanla karşılaştırılır. */
function selfRecord(self,r){
  if(!self||!S.self[self])return;
  const ok=self==="know"?(r==="good"||r==="easy"):self==="unsure"?(r==="hard"||r==="good"):r==="again"||r==="hard";
  S.self[self].n++;if(ok)S.self[self].ok++;
}
function revealRecall(ok){const it=cur();record(it,ok,null);logEv(ok?"wordRecalled":"wordMissed",{w:it.id,qt:it.k});SS.stage="done";render()}
function markReveal(){if(SS&&SS.trev==null)SS.trev=validRt(Date.now()-SS.t0i,SS.hid)}
function rate(r){
  const it=cur(),id=it.id;
  if(SS.self&&!it.open)selfRecord(SS.self,r);
  if(SS.self==="know"){SS.claim=SS.claim||{};
    if(r==="again"){S.self.verify.n++}                                  // cevabı görünce bilmediği anlaşıldı
    else{SS.claim[id]=true;if(!SS.knowIds.includes(id)&&S.cards[id]&&!SS.newIds.includes(id))SS.knowIds.push(id)}}
  if(SS.trev===undefined||SS.trev===null)markReveal();
  if((r==="good"||r==="easy")&&S.cards[id])noteRt(S.cards[id],SS.trev);
  schedule(id,r);SS.acts=(SS.acts||0)+1;
  logEv("reviewCompleted",{w:id,qt:it.k,rt:SS.trev,d:BY[id]&&BY[id].l,r:r[0]});
  if(it.open)logEv(r==="good"||r==="easy"?"wordRecalled":"wordMissed",{w:id,qt:"open"});
  if(r==="again"){SS.again.add(id);SS.hard.add(id);SS.rq[id]=(SS.rq[id]||0)+1;if(SS.rq[id]<=2)SS.phases[SS.pi].items.push({k:it.k==="learn"?"learn":"flash",id,again:true,hard:it.hard})}
  if(r==="hard")SS.hard.add(id);
  if(S.queue.includes(id))S.queue=S.queue.filter(x=>x!==id);
  save();next();
}
function next(){const pv=cur();if(pv&&pv.k==="leech"&&S.cards[pv.id]){const lc=S.cards[pv.id];lc.leechShown=today();lc.leechTrack={t:today(),fails:0,seen:{}}}SS.ii++;if(prepare())render();else finish();if(typeof window!=="undefined")window.scrollTo(0,0)}
function finish(){
  const t=today(),mode=SS.mode;
  if(mode==="daily")S.doneDay=t;
  if(mode!=="place"&&S.last!==t){S.streak=(S.last===t-1)?S.streak+1:1;S.last=t}
  S.best=Math.max(S.best||0,S.streak);
  const d=dayRec(t);
  d.n+=SS.newIds.length;d.r+=SS.revIds.length;
  const secs=Math.round((Date.now()-SS.t0)/1000);
  if(mode==="yds"){
    const bt={};for(const k in SS.ydsT)bt[k]=SS.ydsT[k];
    S.mini.push({d:t,n:SS.q,c:SS.c,secs,bt});if(S.mini.length>30)S.mini.shift();
    if(bt.rd)readAdjust();
    summary={type:"yds",n:SS.q,c:SS.c,secs,bt,weak:[...SS.ydsWrong],log:SS.ydsLog};
  }else if(mode==="place"){
    const lab=x=>x.n?(x.c/x.n>=.8?"Strong":x.c/x.n>=.5?"Developing":"Limited"):"–";
    const P=SS.place;S.placement={core:lab(P.core),inter:lab(P.inter),adv:lab(P.adv),raw:P,d:t};
    S.placeKnown=[...new Set([...(S.placeKnown||[]),...SS.placeOk])];
    summary={type:"place",placement:S.placement,q:SS.q,c:SS.c};
  }else if(mode==="read"||mode==="clz"||mode==="trap"||mode==="conn"){
    if(mode==="read")S.readDone[SS.pid]=t;if(mode==="clz")S.clozeDone[SS.czid]=t;
    const rch=(mode==="read"||mode==="clz")?readAdjust():null;
    summary={type:mode,q:SS.q,c:SS.c,secs,hard:[...SS.hard],studied:SS.studied,pid:SS.pid,czid:SS.czid,rch,rl:S.readLevel};
  }else{
    const areas=Object.entries(SS.sk).filter(([k,x])=>x.c+x.w>=2).map(([k,x])=>({k,a:x.c/(x.c+x.w)}));
    areas.sort((a,b)=>b.a-a.a);
    const clusters={};SS.newIds.forEach(id=>{const g=BY[id].g;(clusters[g]=clusters[g]||[]).push(id)});
    summary={type:mode,n:SS.newIds.length,r:SS.revIds.length,q:SS.q,c:SS.c,mastered:SS.mastered,weakNow:weakList().length,hard:[...SS.hard].filter(id=>BY[id]),best:areas[0]||null,worst:areas.length>1?areas[areas.length-1]:null,
      tomorrow:Object.values(S.cards).filter(c=>c.due<=t+1).length,pair:SS.pair,clusters,deferred:SS.deferred,rev:SS.revRec,ctx0:SS.ctx0,ctx1:S.ctxLevel,dq:SS.dqSkipped,cluster:SS.cluster};
  }
  const L=S.sessLog.find(x=>x.sid===SS.sid);if(L){L.done=SS.acts||0;L.ok=true;L.secs=Math.min(7200,secs)}
  if(mode!=="place"&&S.calStart==null)S.calStart=t;
  logEv("sessionCompleted",{qt:mode,r:SS.q?Math.round(100*SS.c/SS.q):null});
  if(mode==="read")logEv("readingCompleted",{q:SS.pid,r:SS.q?Math.round(100*SS.c/SS.q):null,d:S.readLevel});
  if(mode==="clz")logEv("clozeCompleted",{q:SS.czid,r:SS.q?Math.round(100*SS.c/SS.q):null,d:S.readLevel});
  if(mode==="yds")logEv("miniYdsCompleted",{q:String(SS.ydsN),r:SS.q?Math.round(100*SS.c/SS.q):null});
  if(summary&&["daily","extra","quick","weak","fav","cluster"].includes(mode))summary.keep3=pick3(SS);
  maintenance();
  REV++;save();SS=null;document.body.classList.remove("in-session");tab="summary";const r0=Date.now();render();perfMilestone(Date.now()-r0);flush();if(typeof window!=="undefined")window.scrollTo(0,0);
}
function exitSession(){
  if(SS){const L=S.sessLog.find(x=>x.sid===SS.sid);if(L){L.done=SS.acts||0;L.ok=false}logEv("sessionAbandoned",{qt:SS.mode,r:SS.planned?Math.round(100*(SS.acts||0)/SS.planned):null})}
  SS=null;sheet=null;document.body.classList.remove("in-session");tab="home";save();flush();render()}
/* Aktif oturum anlık görüntüsü: sayfa yenilenirse oturum kaldığı yerden sürdürülebilir. Cevaplar ve öğrenme durumu zaten anında kaydedilir. */
const SNAP_SETS=["hard","again","pen","pairHit","ydsWrong","weakSet"];
function snapItem(it){const o=Object.assign({},it);
  if(it.k==="passage"){o.p=undefined;o.pid=it.p.id}
  else if(it.p&&it.p.ws){o.p={ws:it.p.ws,tip:it.p.tip,personal:!!it.p.personal,n:it.p.n}}
  if(it.cz){o.cz=undefined;o.czid=it.cz.id}
  if(it.t){o.t=undefined;o.ti=TRAPS.indexOf(it.t)}
  if(it.L){o.L=undefined;o.Lid=it.L.id}
  return o}
function unsnapItem(o){const it=Object.assign({},o);
  if(o.pid!=null){it.p=PBY[o.pid];delete it.pid}
  if(o.czid!=null){it.cz=CLOZES.find(c=>c.id===o.czid);delete it.czid}
  if(o.ti!=null){it.t=TRAPS[o.ti];delete it.ti}
  if(o.Lid!=null){it.L=LADDERS.find(L=>L.id===o.Lid);delete it.Lid}
  if((it.k==="passage"&&!it.p)||(o.czid!=null&&!it.cz)||(o.ti!=null&&!it.t)||(o.Lid!=null&&!it.L))throw new Error("snapshot item");
  return it}
function sessionSnapshot(){
  if(!SS)return null;
  const o={};for(const k in SS){const v=SS[k];if(v instanceof Set)o[k]=[...v];else if(k!=="phases")o[k]=v}
  o.phases=SS.phases.map(ph=>({key:ph.key,label:ph.label,dyn:ph.dyn,items:ph.items.map(snapItem)}));
  return JSON.stringify({v:1,d:today(),at:Date.now(),alg:ALG,ss:o});
}
function pendingSession(){try{const r=STORE.get(KEY+".session");if(!r)return null;const x=JSON.parse(r);if(!x||x.v!==1||x.d!==today()||!x.ss)return null;return x}catch(e){return null}}
function restoreSession(){
  const x=pendingSession();if(!x)return false;
  try{const o=x.ss;const ss=Object.assign({},o);SNAP_SETS.forEach(k=>{if(Array.isArray(o[k]))ss[k]=new Set(o[k])});
    ss.phases=o.phases.map(ph=>({key:ph.key,label:ph.label,dyn:ph.dyn,items:ph.items.map(unsnapItem)}));
    if(!(ss.pi<ss.phases.length))throw new Error("snapshot position");
    SS=ss;SS.ans=null;SS.stage="front";SS.self=null;
    const it=cur();if(it&&OPTK.includes(it.k))it.opts=null;
    document.body.classList.add("in-session");sheet=null;
    if(!prepare()){finish();return true}
    render();return true}
  catch(e){logCritical("session restore error",e);SS=null;try{STORE.remove(KEY+".session")}catch(x){}return false}
}
function discardSession(){try{STORE.remove(KEY+".session")}catch(e){}}
function streakNow(){const t=today();return(S.last===t||S.last===t-1)?S.streak:0}
function days30(){const t=today();let n=0;for(let d=t-29;d<=t;d++)if(S.days[d]&&(S.days[d].q||S.days[d].n||S.days[d].r))n++;return n}

