/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= v5: OLAY GÜNLÜĞÜ, BAKIM VE KOÇLUK ================= */
const EVT=["sessionStarted","sessionCompleted","sessionAbandoned","wordShown","wordRecalled","wordMissed","questionAnswered","questionCorrect","questionWrong","reviewCompleted","readingCompleted","clozeCompleted","miniYdsCompleted"];
/* Kompakt olay: [zaman, tür, oturum, kelime, soru, soru tipi, tepki ms, zorluk, sonuç, algoritma] — yalnızca bu cihazda, öğrenme algoritması için */
function logEv(type,o){o=o||{};if(!Array.isArray(S.ev))S.ev=[];S.ev.push([Date.now(),EVT.indexOf(type),SS?SS.sid:null,o.w??null,o.q??null,o.qt??null,o.rt??null,o.d??null,o.r??null,ALG]);if(S.ev.length>8000)aggregateEvents(today()-30)}
function evDay(ts){const d=new Date(ts);return Math.floor((ts-d.getTimezoneOffset()*60000)/86400000)}
/* Eski ayrıntılı olaylar günlük özete (dailyStats) taşınır; öğrenme durumu ve tekrar geçmişi korunur. */
function aggregateEvents(beforeDay){
  const keep=[];let moved=0;
  for(const e of S.ev){const d=evDay(e[0]);if(d>=beforeDay){keep.push(e);continue}
    const x=S.dailyStats[d]||(S.dailyStats[d]={e:{},q:0,c:0,rt:0,rtn:0});const ty=EVT[e[1]]||"?";x.e[ty]=(x.e[ty]||0)+1;
    if(ty==="questionCorrect"||ty==="questionWrong"){x.q++;if(ty==="questionCorrect")x.c++}
    if(e[6]!=null){x.rt+=e[6];x.rtn++}moved++}
  S.ev=keep;return moved;
}
function storageChars(){try{return JSON.stringify(S).length}catch(e){return 0}}
const STORAGE_BUDGET=5e6,STORAGE_SOFT=3.5e6,STORAGE_HARD=4.2e6;
function maintenance(){
  const t=today();aggregateEvents(t-90);
  try{trackGaps(t);quadSnapshot(t)}catch(e){}
  let n=storageChars();
  if(n>STORAGE_SOFT){aggregateEvents(t-30);n=storageChars()}
  if(n>STORAGE_HARD){aggregateEvents(t-7);for(const id in S.cards){const c=S.cards[id];if(c.exp)for(const k in c.exp)if(t-c.exp[k]>60)delete c.exp[k]}S.sessLog=S.sessLog.slice(-40);n=storageChars()}
  return n;
}
/* Sürpriz kontrol adayları: kararlı kalıcı kelimeler, kalıcılığın 30/60/90. günü civarı, tekrar zamanı gelmemiş */
function surpriseCandidates(t){
  const out=[];for(const id in S.cards){const c=S.cards[id];if(!BY[id]||c.masteredOn==null||c.due<=t)continue;
    if(c.stableOn==null&&t-c.masteredOn<45)continue;const age=t-c.masteredOn;
    for(const m of [30,60,90])if(Math.abs(age-m)<=3&&!(c.surpr||[]).includes(m)){out.push({id,m});break}}
  return shuffle(out);
}
/* Kırılgan kalıcı: kalıcılıktan 7+ gün sonra doğru bağlam/okuma cevabı → kararlı kalıcı */
function fragileCheck(c,ok){const t=today();if(c.masteredOn==null||c.stableOn!=null||t-c.masteredOn<7)return;S.fragileStats.n++;bump(S.mastCheck,"7",ok);if(ok){S.fragileStats.ok++;c.stableOn=t}}
/* Bugünden aklında kalması gereken 3 kelime */
function pick3(ss){
  const out=[];const nw=ss.newIds.filter(id=>BY[id]).sort((a,b)=>BY[b].p-BY[a].p);if(nw[0])out.push(nw[0]);
  const wk=[...(ss.weakSet||[])].filter(id=>BY[id]&&!out.includes(id));
  const rec=wk.find(id=>statusOf(id)!=="weak")||wk[0]||[...ss.hard].find(id=>BY[id]&&S.cards[id]&&!out.includes(id));if(rec)out.push(rec);
  const base=out[0]||out[1];
  const sem=ss.studied.find(id=>BY[id]&&!out.includes(id)&&base&&(sameLadder(id,base)||BY[id].g===BY[base].g))||ss.studied.find(id=>BY[id]&&!out.includes(id));if(sem)out.push(sem);
  return out.slice(0,3).map(id=>({id,tr:BY[id].tr.split(" / ")[0],col:BY[id].col[0]||""}));
}
/* Oturum tamamlama analizi (son 10 oturum, süreye göre) */
function completionStats(){
  const L=S.sessLog.filter(x=>["daily","extra","quick"].includes(x.mode)).slice(-10),by={};
  for(const x of L){const b=by[x.len]||(by[x.len]={n:0,ok:0});b.n++;if(x.ok)b.ok++}
  let tip=null;const cur=by[S.settings.length];
  if(cur&&cur.n>=3&&cur.ok/cur.n<.7)for(const k in by){if(k!==S.settings.length&&by[k].n>=3&&by[k].ok/by[k].n>=.85){tip=`${LEN[k].min} dakikalık oturumlarda daha düzenli çalışıyorsun (%${pct(by[k].ok/by[k].n)} tamamlama).`;break}}
  return{by,n:L.length,tip};
}
/* Kişisel yeni kelime önerisi: ≥14 çalışma günü ve ≥10 oturum sonra. Tercihin üzerine yazılmaz. */
function suggestNewPerDay(){
  const t=today();let days=0,q=0,c=0;for(let d=t-27;d<=t;d++){const x=S.days[d];if(x&&(x.q||x.n||x.r))days++;if(x&&d>t-14){q+=x.q||0;c+=x.c||0}}
  const sess=S.sessLog.filter(x=>x.d>=t-27&&["daily","extra"].includes(x.mode));
  if(days<14||sess.length<10)return{ready:false,days,sess:sess.length};
  const acc=q?c/q:0,lapse=lapseRate(),backlog=dueList().length,comp=sess.filter(x=>x.ok).length/sess.length,freq=days/28,cur=S.settings.newPerDay;
  let rec=cur;
  if(acc<.75||(lapse!=null&&lapse>.25)||backlog>60||comp<.7)rec=Math.max(5,cur-3);
  else if(acc>=.85&&backlog<25&&comp>=.9&&freq>=.7)rec=Math.min(20,cur+3);
  const text=rec<cur?`Mevcut çalışma düzenine göre günlük ${rec} yeni kelime daha sürdürülebilir görünüyor.`:rec>cur?`Tekrarların dengede ve doğruluğun yüksek; günlük ${rec} yeni kelimeye çıkabilirsin.`:`Günlük ${cur} yeni kelime mevcut temponla uyumlu görünüyor.`;
  return{ready:true,rec,cur,acc,lapse,backlog,comp,freq,days,text};
}
/* YDS hazırlık göstergeleri (yalnızca uygulama içi performans) */
function readiness(){
  const m=monthStats(),sm=statusMap(),lab=(v,n,min,hi,mid)=>n<min?"Veri yetersiz":v>=hi?"Strong":v>=mid?"Developing":"Limited";
  const core=W.filter(w=>w.l<=3),cov=core.filter(w=>sm[w.id]==="mastered"||sm[w.id]==="familiar").length/core.length;
  const meanA=accOf(S.err.mean),nMean=cnt(S.err.mean);
  const vocab=nMean<30?"Veri yetersiz":cov>=.6&&meanA>=.8?"Strong":cov>=.25&&meanA>=.65?"Developing":"Limited";
  const cd=Object.values(S.connDim).reduce((a,x)=>({c:a.c+x.c,w:a.w+x.w}),{c:0,w:0});
  const cz=(()=>{let c=0,w=0;const t=today();for(let d=t-29;d<=t;d++){const x=S.days[d];if(x&&x.cz){c+=x.cz.c;w+=x.cz.w}}return{c,w}})();
  return[{k:"Vocabulary Readiness",v:vocab,d:`Temel+orta kelimelerin %${pct(cov)}'i tanıdık/kalıcı`},
    {k:"Reading Transfer",v:lab(m.read??0,cnt(m.rd),15,.8,.6),d:m.read==null?"":`son 30 gün okuma %${pct(m.read)} · seviye ${READ_LABEL[READ_LEVELS[S.readLevel]]}`},
    {k:"Connectors",v:lab(accOf(cd)??0,cnt(cd),20,.85,.65),d:cnt(cd)?`bağlaç soruları %${pct(accOf(cd))}`:""},
    {k:"Context",v:lab(m.ctx??0,cnt(m.sk.ctx),20,.8,.6),d:m.ctx==null?"":`son 30 gün bağlam %${pct(m.ctx)} · ${CTX_LEVELS[S.ctxLevel]}`},
    {k:"Cloze",v:lab(accOf(cz)??0,cnt(cz),10,.8,.6),d:cnt(cz)?`cloze boşlukları %${pct(accOf(cz))}`:""}];
}
/* Ana ekranda tek öneri */
function homeTip(){
  const t=today();if(!Object.keys(S.cards).length)return null;
  const p=plan("daily"),rg=taggedIds("RecognitionGap").length,le=taggedIds("Leech").length;
  if(p.load==="heavy")return"Tekrar yükün yüksek; bugün yeni kelimeyi azaltıp unutulmaya en yakın kelimelere odaklanıyoruz.";
  if(rg>=5)return`Bugün bağlam çalışmalarına biraz daha ağırlık vereceğiz: ${rg} kelimeyi kartta tanıyorsun ama soruda kaçırıyorsun.`;
  const wr=weeklyReport();if(wr.weakG){const n=W.filter(w=>w.g===wr.weakG.g&&S.cards[w.id]&&p.dueAll.includes(w.id)).length;if(n>=2)return`Son günlerde ${GROUPS[wr.weakG.g][1]} grubunda zorlandığın için ${n} kelimeyi yeniden göreceksin.`}
  if(le)return`${le} kelime çok tekrar etmene rağmen oturmadı; bugün onları farklı bir yöntemle göreceksin.`;
  const sg=suggestNewPerDay();if(sg.ready&&sg.rec!==sg.cur)return sg.text;
  const ct=completionStats();if(ct.tip)return ct.tip;
  if(p.dueAll.length<15&&p.newIds.length)return`Tekrar yükün düşük; bugün ${p.newIds.length} yeni kelime ekleyebiliriz.`;
  return null;
}
/* Haftalık 3 kazanım (gerçek veriden) */
function weeklyWins(){
  const t=today(),a=weekStats(t),b=weekStats(t-7),out=[];
  if(a.m>0)out.push(`${a.m} kelime Kalıcı seviyesine geçti.`);
  for(const k of ["ctx","syn","mean","conf"]){const x=a.sk[k],y=b.sk[k];if(cnt(x)>=8&&cnt(y)>=8){const nx=x.c/cnt(x),ny=y.c/cnt(y);if(nx-ny>=.05){out.push(`${SKILLS[k]} doğruluğun %${pct(ny)} → %${pct(nx)} yükseldi.`);break}}}
  const gs=Object.keys(a.g).filter(g=>GROUPS[g]).map(g=>({g,...groupMastery(g)})).filter(x=>x.score>=50).sort((x,y)=>y.score-x.score);
  if(gs[0])out.push(`${GROUPS[gs[0].g][1]} kümesinde ustalık %${gs[0].score} oldu.`);
  if(out.length<3&&a.days>=4)out.push(`Son 7 günün ${a.days}'ında çalıştın.`);
  if(out.length<3&&a.rd&&cnt(a.rd)>=6&&a.rd.c/cnt(a.rd)>=.7)out.push(`Okuma sorularında %${pct(a.rd.c/cnt(a.rd))} doğruluk.`);
  return out.slice(0,3);
}
/* Mini YDS eğilimi: son 5 / 10 / 20 test; yeterli veri yoksa üretilmez */
function miniTrend(){
  if(S.mini.length<5)return null;const types=["vocab","ct","sc","tr","rs","pc","rd"];const out={};
  for(const N of [5,10,20]){if(S.mini.length<N&&N!==5)continue;const last=S.mini.slice(-N);
    for(const tp of types){const x=last.reduce((a,m)=>{const v=m.bt&&m.bt[tp];return v?{c:a.c+v.c,w:a.w+v.w}:a},{c:0,w:0});(out[tp]=out[tp]||{})[N]=cnt(x)>=5?x.c/cnt(x):null}}
  return out;
}
function calibDashboard(){
  const rev=S.ev.filter(e=>EVT[e[1]]==="reviewCompleted").length+Object.values(S.dailyStats).reduce((a,x)=>a+(x.e.reviewCompleted||0),0);
  const rts=S.rtStats;const tot=S.schedTot;
  let days=0;const t=today();for(const d in S.days){const x=S.days[d];if(x.q||x.n||x.r)days++}
  return{reviews:rev,brier:S.brier.n?S.brier.sum/S.brier.n:null,calib:calibReport(),rt:rts.n?rts.sum/rts.n:null,rtDropped:rts.dropped,hard:S.hardStats,
    easy:accOf({c:tot.easy.ok,w:tot.easy.n-tot.easy.ok}),good:accOf({c:tot.good.ok,w:tot.good.n-tot.good.ok}),hardR:accOf({c:tot.hard.ok,w:tot.hard.n-tot.hard.ok}),tot,spacing:S.spacing,log:S.schedLog,
    leech:taggedIds("Leech"),recog:taggedIds("RecognitionGap"),recall:taggedIds("RecallGap"),fragile:taggedIds("FragileMastered"),pairs:personalPairs(),days,ready:days>=14,
    chars:storageChars(),events:S.ev.length,agg:Object.keys(S.dailyStats).length,alg:ALG,algHistory:S.algHistory,transfer37:S.transfer37,surprise:S.surpriseStats,fragileStats:S.fragileStats};
}
maintenance();

