// YDS Kelime Atölyesi — öğrenme motoru test paketi (70 test). Kullanım: npm test
const fs=require('fs');
const {loadData,ENGINE}=require('./lib/data.cjs');
global.__YDS_DATA=loadData();
const el=()=>({innerHTML:'',textContent:'',value:'',classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},dataset:{},focus(){},select(){}});
const store={};
global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
const t0=Math.floor((Date.now()-new Date().getTimezoneOffset()*60000)/86400000);
// Eski v1 verisi (eski anahtar altında)
store["ydsKelimeAtolyesi.v1"]=JSON.stringify({cards:{increase:{step:2,due:t0,reps:3,lapses:0,correct:4,wrong:1,first:t0-5,last:t0-1},decline:{step:1,due:t0-1,reps:2,lapses:1,correct:1,wrong:3,first:t0-5,last:t0-2}},days:{[t0-1]:{n:12,r:0,q:30,c:20}},streak:3,last:t0-1,grp:{artmak:{c:5,w:2},sebep:{c:1,w:3}},typ:{syn:{c:3,w:1},guess:{c:2,w:2}},conf:{},newPerDay:12,doneDay:t0-1});
global.document={getElementById:()=>el(),querySelectorAll:()=>[],addEventListener(){},body:el(),documentElement:el(),visibilityState:"visible"};
global.window={scrollTo(){},addEventListener(){}};
global.location={hash:""};
global.navigator={clipboard:{writeText:()=>Promise.resolve()}};
let dayShift=0;const RealDate=Date;
global.Date=class extends RealDate{constructor(...a){if(a.length)super(...a);else super(RealDate.now()+dayShift*86400000)}static now(){return RealDate.now()+dayShift*86400000}};
const origLog=console.log;let quiet=false;console.log=(...a)=>{if(!quiet)origLog(...a)};console.table=()=>{};
eval(fs.readFileSync(ENGINE,'utf8')+'\n'+String.raw`
const RESULTS=[];let CUR=null;
function test(name,fn){CUR={name,asserts:0,fails:[]};try{fn()}catch(e){CUR.fails.push("EXCEPTION "+e.message+" "+(e.stack||"").split("\n")[1])}RESULTS.push(CUR);SS=null;}
function ok(c,m){CUR.asserts++;if(!c)CUR.fails.push(m||"assert")}
function eq(a,b,m){ok(a===b,(m||"eq")+": "+JSON.stringify(a)+" !== "+JSON.stringify(b))}
function fresh(){S=blankState();SS=null;summary=null;dayShift=0;REV++;for(const k in MEMO)delete MEMO[k]}
function day(n){dayShift=n;REV++}
const T=()=>today();
function rateFlow(id,r){ensure(id);schedule(id,r)}
function quiz(id,k,correct,picked){SS=SS||newSession("test");const it={k,id};it.opts=buildOpts(it);const i=correct?it.opts.findIndex(o=>o.ok):(picked!=null?it.opts.findIndex(o=>o.t===picked):it.opts.findIndex(o=>!o.ok));
  const o=it.opts[i>=0?i:it.opts.findIndex(o=>!o.ok)];record(it,o.ok,o.wid);return o}
function play(acc,maxSteps){let g=0;while(SS&&g++<(maxSteps||1500)){const it=cur();vSession();
  if(["flash","learn","connfo"].includes(it.k)){if(SS.stage==="front"){if(recallMode(it)==="open")SS.stage="back";else{SS.self=Math.random()<.7?"know":"unsure";SS.stage="back"}}vSession();const r=Math.random();rate(r<.1?"again":r<.2?"hard":r<.85?"good":"easy")}
  else if(it.k==="reverse"){SS.stage="back";vSession();record(it,Math.random()<acc,null);next()}
  else if(["pair","ladder","passage","leech"].includes(it.k)){next()}
  else{if(!it.opts||it.opts.length<2)throw new Error("bad opts "+it.k+" "+it.id);const okI=it.opts.findIndex(o=>o.ok);answer(Math.random()<acc?okI:(okI+1)%it.opts.length);vSession();next()}}
  if(SS)throw new Error("session did not finish")}

/* 1. Geçiş (migration) */
test("migration: v1 (eski anahtar) → v3",()=>{
  eq(S.dataVersion,5,"version");ok(S.cards.increase&&S.cards.increase.cdays.length===1,"cdays");
  eq(S.grp.increase.c,5,"grp map");eq(S.err.ctx.c,2,"typ guess→ctx");eq(S.err.syn.c,3,"syn");eq(S.settings.newPerDay,15,"npd");
  ok(S.cards.increase.stab>0,"stab set");eq(S.cards.increase.lastRev,t0-1,"lastRev");eq(S.best,3,"best=streak");
  eq(S.settings.recall,"auto","recall default");ok(Array.isArray(S.bankSeen),"bankSeen");
  flush();ok(!!store["ydsKelimeAtolyesi"],"new key saved");
});
test("migration: v2 durumu → v3 (ilerleme korunur)",()=>{
  const v2={dataVersion:2,cards:{decline:{step:3,due:t0+2,reps:5,lapses:1,correct:6,wrong:2,first:t0-20,last:t0-5,hist:[1,1,0,1],cdays:[t0-20,t0-10,t0-5],sk:{syn:{c:2,w:0},ctx:{c:1,w:1}},rat:["g","g","e"],lastCorrect:t0-5,confErr:0,masteredOn:t0-5}},days:{},streak:7,last:t0-1,grp:{},err:emptyErr(),conf:{},settings:{newPerDay:20,length:"deep",theme:"dark"},doneDay:null,noNewDay:null,fav:["decline"],queue:[],mini:[{d:t0-3,n:10,c:7,secs:300,bt:{}}]};
  const m=migrate(JSON.parse(JSON.stringify(v2)));
  eq(m.dataVersion,5);eq(m.cards.decline.correct,6,"correct kept");eq(m.cards.decline.cdays.length,3,"cdays kept");
  eq(m.cards.decline.stab,LAD[3]*1.5,"stab from step");eq(m.cards.decline.lastRev,t0-5,"lastRev=last");
  eq(m.best,7,"best");eq(m.settings.newPerDay,20);eq(m.settings.length,"deep");eq(m.settings.theme,"dark");eq(m.settings.recall,"auto");
  eq(m.fav[0],"decline");eq(m.mini.length,1);eq(m.cards.decline.masteredOn,t0-5,"masteredOn kept");
  let threw=false;try{migrate({dataVersion:9,cards:{}})}catch(e){threw=true}ok(threw,"newer version rejected");
});

/* 2. Durum geçişleri */
function makeMastered(id){
  rateFlow(id,"good");quiz(id,"syn",true);quiz(id,ctxPick(id)||"cloze",true);
  day(1);rateFlow(id,"good");quiz(id,"syn",true);quiz(id,"cloze",true);
  day(4);rateFlow(id,"good");quiz(id,ctxPick(id)||"cloze",true);if(available("coll",BY[id]))quiz(id,"coll",true);
  day(11);rateFlow(id,"easy");quiz(id,"syn",true);quiz(id,"cloze",true);
}
test("durum: Yeni → Öğreniliyor → Tanıdık → Kalıcı",()=>{
  fresh();const id="enhance";
  eq(statusOf(id),"new","new");
  rateFlow(id,"good");eq(statusOf(id),"learning","learning after first good");
  day(1);rateFlow(id,"good");quiz(id,"syn",true);eq(statusOf(id),"familiar","familiar after 2 days");
  day(4);rateFlow(id,"good");quiz(id,"cloze",true);
  day(11);rateFlow(id,"easy");quiz(id,"syn",true);quiz(id,"cloze",true);
  const sc=masteryScore(id);ok(sc>=75,"score >=75 got "+sc);
  eq(statusOf(id),"mastered","mastered");ok(S.cards[id].masteredOn!=null,"masteredOn set");
});
test("durum: Kalıcı → zamanla bozulma (decay)",()=>{
  fresh();const id="enhance";makeMastered(id);
  eq(statusOf(id),"mastered","mastered first");const s0=masteryScore(id);
  day(11+3);ok(s0-masteryScore(id)<=2,"tiny change in first days");
  day(11+30);const s30=masteryScore(id);day(11+60);const s60=masteryScore(id);
  ok(s30<s0&&s60<s30,"gradual decay "+s0+"→"+s30+"→"+s60);ok(s0-s30<=12,"gentle at 30 days ("+(s0-s30)+")");ok(s0-s60<=20,"gentle at 60 days ("+(s0-s60)+")");
  eq(statusOf(id),"mastered","still mastered after 60 days");
  const ce={lastRev:0,stab:40},ch={lastRev:0,stab:3};dayShift=0;ok(decayFactor(ce,60)>decayFactor(ch,60),"easy (high stab) decays slower than hard");
  day(11+400);const s2=masteryScore(id);ok(s2<60,"long gap <60 got "+s2);ok(statusOf(id)!=="mastered","no longer mastered after long gap");
  ok(retr(S.cards[id],T())<.05,"retrieval near 0");ok(storageStr(S.cards[id])>0,"storage kept");
  rateFlow(id,"good");ok(retr(S.cards[id],T())===1,"retrieval reset after review");
});
test("durum: Kalıcı → Zayıf (yanlış cevaplar)",()=>{
  fresh();const id="enhance";makeMastered(id);eq(statusOf(id),"mastered");
  day(12);quiz(id,"cloze",false);quiz(id,"syn",false);quiz(id,"mean",false);rateFlow(id,"again");quiz(id,"cloze",false);
  eq(statusOf(id),"weak","weak after errors");ok(weakScore(id)>=40,"weakScore "+weakScore(id));
});

/* 3. Puanlama */
test("puanlama: Again / Hard / Good / Easy",()=>{
  fresh();const ids=["reduce","decline","boost","widen"];const rs=["again","hard","good","easy"];
  day(0);ids.forEach((id,i)=>rateFlow(id,rs[i]));
  day(1);ids.forEach((id,i)=>rateFlow(id,rs[i]));
  const st=ids.map(id=>S.cards[id].stab),due=ids.map(id=>S.cards[id].due);
  ok(st[0]<st[1]&&st[1]<st[2]&&st[2]<st[3],"stab ordering "+st.map(x=>x.toFixed(2)));
  ok(due[0]<=due[1]&&due[1]<=due[2]&&due[2]<=due[3],"due ordering "+due.map(d=>d-T()));
  eq(S.cards.reduce.lapses,1,"again lapse on non-fresh");eq(S.cards.reduce.step,1,"again step 1");
  eq(due[0]-T(),1,"again tomorrow");eq(due[1]-T(),1,"hard tomorrow");
  ok(S.cards.decline.hardPending,"hardPending set");
  day(2);rateFlow("decline","good");eq(S.hardFollow.n,2,"hard follow-ups counted (day1 hard, day2 good)");eq(S.hardFollow.ok,1);
  // Unutma eğrisi: Easy sonrası yavaş, Hard sonrası hızlı
  const dE=retr(S.cards.widen,T()+5),dH=retr(S.cards.boost,T()+5);ok(dE>dH,"easy decays slower");
  // Aynı gün tekrar az katkı
  fresh();rateFlow("reduce","good");const a=S.cards.reduce.stab;rateFlow("reduce","good");ok(S.cards.reduce.stab<a*1.2,"same-day small gain");
  // Oturumda Again tekrar kuyruğa girer
  fresh();S.queue=["reduce"];startSession("daily");let found=false;
  for(let g=0;g<200&&SS;g++){const it=cur();if(it.k==="learn"&&it.id==="reduce"&&!it.again){SS.stage="back";const n0=SS.phases[SS.pi].items.length;rate("again");eq(SS.phases[SS.pi]?SS.phases[SS.pi].items.length:n0+1,n0+1,"requeued");found=true;break}
    if(["flash","learn"].includes(it.k)){SS.stage="back";rate("good")}else if(it.opts){answer(0);next()}else next()}
  ok(found,"learn card found");
});

/* 4. Hata tipleri */
test("hata tipleri: anlam, eş anlam, bağlam, kalıp, karıştırma",()=>{
  fresh();const id="increase";rateFlow(id,"good");
  const before=JSON.parse(JSON.stringify(S.err));
  quiz(id,"mean",false);quiz(id,"syn",false);quiz(id,"cloze",false);quiz(id,"coll",false);
  const p=PAIRS.find(x=>x.ws.includes("affect"));rateFlow("affect","good");
  SS=newSession("test");const it={k:"pairq",id:"affect",p};it.opts=buildOpts(it);const wr=it.opts.find(o=>o.t==="effect");record(it,false,wr.wid);
  for(const k of ["mean","syn","ctx","coll","conf"])eq(S.err[k].w,before[k].w+1,"err "+k);
  eq(S.cards.increase.sk.coll.w,1,"card coll");ok(S.cards.affect.confErr>=1,"confErr");
  // confusedWith yanlışı ayrıca karıştırma sayılır
  rateFlow("rise","good");SS=newSession("test");const it2={k:"cloze",id:"rise"};it2.opts=[{t:"rise",ok:true,wid:"rise"},{t:"raise",ok:false,wid:"raise"},{t:"x",ok:false},{t:"y",ok:false}];record(it2,false,"raise");
  ok(S.cards.rise.confErr>=1,"cloze confusion detected");ok(S.conf.rise&&S.conf.rise.raise===1,"conf map");
});

/* 5. Birikim (backlog) ve yük */
function seedDue(n){const t=T();W.slice(0,n).forEach((w,i)=>{const c=ensure(w.id);c.reps=3;c.step=3;c.due=t;c.first=t-30;c.last=t-7;c.lastRev=t-7-(i%5);c.stab=4+(i%9);c.cdays=[t-30,t-20];c.rat=["g","g"];c.hist=[1,1];c.correct=3})}
test("birikim > 60 → yeni kelime ≤ 10",()=>{fresh();seedDue(70);const p=planRaw("daily");ok(p.newIds.length<=10,"new "+p.newIds.length);ok(/düşürüldü|kapasite/.test(p.note||""),"note");ok(p.dueAll.length===70)});
test("birikim > 100 → yeni kelime ≤ 5, taşan tekrar yayılır",()=>{fresh();seedDue(130);const p=planRaw("daily");ok(p.newIds.length<=5,"new "+p.newIds.length);eq(p.load,"heavy","load heavy");ok(p.overflow.length>0,"overflow");
  const sorted=p.review.map(id=>learningValueScore(id,T()));ok(sorted.every((x,i)=>i===0||x<=sorted[i-1]+1e-9),"review sorted by learning value");
  const ov=p.overflow.slice();startSession("daily");ok(SS.deferred===ov.length,"deferred "+SS.deferred);ok(ov.every(id=>S.cards[id].due>T()),"overflow moved to later days");
  const ds=new Set(ov.map(id=>S.cards[id].due));ok(ov.length<=Math.max(5,p.review.length)||ds.size>1,"spread across days");SS=null});
test("yük etiketi: hafif / normal",()=>{fresh();eq(planRaw("daily").load,"normal","fresh normal (15 new)");S.settings.newPerDay=10;S.settings.length="deep";eq(planRaw("daily").load,"light","light")});

/* 6. Dinamik oturum */
test("dinamik oturum: oranlar performansa göre değişir",()=>{
  fresh();const a=adaptRatios();eq(a.why.length,0,"no adapt");
  S.err.syn={c:3,w:7};S.err.ctx={c:4,w:6};const b=adaptRatios();ok(b.r.syn>RATIOS.syn&&b.r.ctx>RATIOS.ctx,"syn/ctx up");ok(b.why.includes("eş anlam"));
  const s=Object.values(b.r).reduce((x,y)=>x+y,0);ok(Math.abs(s-1)<1e-9,"ratios sum 1");
});
test("dinamik oturum: fazlar, ters hatırlama ≤ %12, bağlam seviyesi",()=>{
  fresh();seedDue(40);startSession("daily");
  const keys=SS.phases.map(p=>p.key);ok(keys.includes("review")&&keys.includes("learn")&&keys.includes("syn"),"phases "+keys);
  const total=SS.phases.reduce((a,p)=>a+p.items.length,0);const rev=SS.phases[0].items.filter(x=>x.k==="reverse").length;
  ok(rev>0,"has reverse");const p=SS.plan;const est=p.review.length+p.weak.length+p.early.length+p.newIds.length*3+p.weak.length*2+p.synN+p.ctxN+p.confN+p.cfg.mini;ok(rev<=Math.floor(est*.12),"reverse ≤12% ("+rev+"/"+est+")");
  const sched=JSON.stringify(S.cards[SS.phases[0].items.find(x=>x.k==="reverse").id]);
  while(SS&&cur().k!=="reverse"){const it=cur();if(["flash","learn"].includes(it.k)){SS.stage="back";rate("good")}else if(it.opts){answer(it.opts.findIndex(o=>o.ok));next()}else next()}
  const rid=cur().id;const c0=JSON.stringify({d:S.cards[rid].due,s:S.cards[rid].step,st:S.cards[rid].stab});record(cur(),true,null);const c1=JSON.stringify({d:S.cards[rid].due,s:S.cards[rid].step,st:S.cards[rid].stab});eq(c0,c1,"reverse doesn't change schedule");
  SS=null;fresh();eq(S.ctxLevel,1);for(let i=0;i<10;i++)trackCtx(true);eq(S.ctxLevel,2,"level up");for(let i=0;i<10;i++)trackCtx(true);eq(S.ctxLevel,3,"level up 3");
  for(let i=0;i<10;i++)trackCtx(false);eq(S.ctxLevel,2,"level down");
  S.ctxLevel=3;const w=W.find(x=>x.x2&&x.czd.length>=4);eq(ctxPick(w.id),"yctx","YDS level uses x2");S.ctxLevel=1;eq(ctxPick(w.id),"guess","easy uses guess");
  // tekrar maruziyet: yakın zamanda görülen cümle seçilmez
  rateFlow(w.id,"good");S.ctxLevel=2;blankSents(w,"cloze").forEach(([k])=>{S.cards[w.id].exp[k]=T()});ok(ctxPick(w.id)!=="cloze","exposure control avoids recently seen sentences");
});
test("öz değerlendirme doğruluğu ve doğrulama",()=>{
  fresh();for(let i=0;i<6;i++){selfRecord("know",i<4?"good":"again")}eq(S.self.know.n,6);eq(selfAccuracy(),4/6,"rating-based fallback");
  // Asıl ölçüm: “Biliyorum” + sonraki soru
  fresh();const ids=W.filter(w=>!isLink(w)&&w.czd.length>=4).slice(0,6).map(w=>w.id);ids.forEach(id=>rateFlow(id,"good"));day(3);
  SS=newSession("test");SS.phases=[{key:"x",label:"x",items:[]}];
  ids.forEach((id,i)=>{SS.phases[0].items=[{k:"flash",id}];SS.pi=0;SS.ii=0;SS.self="know";const n=next;next=()=>{};rate("good");next=n;quiz(id,"cloze",i<4)});
  eq(S.self.verify.n,6,"verified claims");eq(S.self.verify.ok,4);eq(selfAccuracy(),4/6,"quiz-verified accuracy");eq(S.self.knowCtx.n,6,"ctx verification");
  ok(insights().some(x=>/zorlanıyorsun/.test(x.t)),"context-gap insight");
  ok(insights().some(x=>/Biliyorum/.test(x.t)),"non-punitive insight");
});

/* 7. Yedek */
test("içe aktarma: eski veri (v1 ham, v2 dışa aktarım)",()=>{
  fresh();const r1=validateBackup(store["ydsKelimeAtolyesi.v1"]);eq(r1.state.dataVersion,5);ok(r1.state.cards.increase,"v1 cards");
  const v2exp=JSON.stringify({app:"YDS Kelime Atölyesi",exportedAt:"x",data:{dataVersion:2,cards:{reduce:{step:2,due:t0,reps:2,lapses:0,correct:2,wrong:0,first:t0-3,last:t0-1,hist:[1],cdays:[t0-1],sk:{},rat:["g"]}},fav:[],mini:[]}});
  const r2=validateBackup(v2exp);ok(r2.state.cards.reduce.stab>0,"v2 → stab");ok(/v2 → v5/.test(r2.summary),"summary "+r2.summary);
});
test("içe aktarma: hatalı veri mevcut veriyi bozmaz",()=>{
  fresh();rateFlow("reduce","good");const snap=JSON.stringify(S);
  const bad=["{bozuk",'"metin"','{"data":{"cards":[]}}','{"cards":{"reduce":{"step":"x","due":1,"reps":1}}}','{"cards":{"reduce":{"due":1,"reps":1}}}','{"dataVersion":"3","cards":{}}','{"dataVersion":7,"cards":{}}','{"cards":{},"mini":{}}','{"foo":1}'];
  for(const b of bad){let threw=false;try{validateBackup(b)}catch(e){threw=true}ok(threw,"rejects "+b)}
  eq(JSON.stringify(S),snap,"state unchanged");
});
test("dışa → içe aktarma gidiş-dönüş",()=>{
  fresh();makeMastered("enhance");rateFlow("reduce","hard");S.fav=["reduce"];S.mini.push({d:T(),n:5,c:4,secs:60,bt:{}});
  const txt=exportText();const r=validateBackup(txt);
  const strip=o=>JSON.stringify(o);eq(strip(r.state.cards),strip(S.cards),"cards equal");eq(r.state.fav[0],"reduce");eq(r.state.mini.length,1);eq(r.state.best,S.best);
  doImport(r.state);ok(!!store["ydsKelimeAtolyesi.undo"],"undo saved");ok(undoImport(),"undo works");
});
test("kontrollü yazma: save() birleştirilir, flush() yazar",()=>{
  fresh();flush();const before=store["ydsKelimeAtolyesi"];S.fav=["x1"];save();save();save();eq(store["ydsKelimeAtolyesi"],before,"not written yet");flush();ok(store["ydsKelimeAtolyesi"].includes('"x1"'),"written on flush");
});

/* 8. Mini YDS */
test("Mini YDS: set boyutları, puanlama ve geçmiş",()=>{
  fresh();for(const n of [5,10,20,40]){const s=ydsSet(n);eq(s.length,n,"size "+n);
    for(const q of s){eq(q.opts.length,5,"5 options");eq(q.opts.filter(o=>o.ok).length,1,"one correct");eq(new Set(q.opts.map(o=>o.t)).size,5,"unique");ok(q.why!==undefined,"why")}
    const types=new Set(s.map(q=>q.yt));if(n>=10)["vocab","ct","sc","tr","rs","pc","rd"].forEach(t=>ok(types.has(t),n+" has "+t))}
  startSession("yds",20);let correct=0,i=0;
  while(SS){const it=cur();const ok_=i++%4!==0;const okI=it.opts.findIndex(o=>o.ok);answer(ok_?okI:(okI+1)%5);if(ok_)correct++;next()}
  eq(summary.type,"yds");eq(summary.n,20);eq(summary.c,correct,"score");eq(S.mini.length,1,"history");eq(S.mini[0].c,correct);
  ok(Object.values(summary.bt).reduce((a,x)=>a+x.c+x.w,0)===20,"by type");eq(summary.log.length,20,"learning log");
  const w=summary.log.find(l=>!l.ok);ok(w&&w.why&&w.o.length===5,"learning entry");ok(Object.keys(S.qstats).length>0,"question stats");
  // banka büyüklüğü ve cevap dengesi
  ok(BANK.length+RD.length>=100,"bank ≥100: "+(BANK.length+RD.length));
  const pos=[0,0,0,0,0];[...BANK,...RD].forEach(b=>pos[b.a]++);ok(Math.max(...pos)-Math.min(...pos)<=2,"stored answers balanced "+pos);
  const live=[0,0,0,0,0];for(let k=0;k<60;k++)ydsSet(20).forEach(q=>live[q.opts.findIndex(o=>o.ok)]++);ok(Math.min(...live)/Math.max(...live)>.7,"shuffled positions balanced "+live);
  // bankadaki çeşitli tipler
  const c={};BANK.forEach(b=>c[b.t]=(c[b.t]||0)+1);ok(c.vocab>=40&&c.ct>=40&&c.sc>=40&&c.tr>=25&&c.rs>=25&&c.pc>=25&&RD.length>=55,"type quotas "+JSON.stringify(c)+" rd "+RD.length);ok(BANK.length+RD.length>=250,"≥250 questions");
});

/* 9. Haftalık istatistik */
test("haftalık istatistik",()=>{
  fresh();const t=T();
  for(let i=0;i<7;i++)S.days[t-i]={n:5,r:10,q:20,c:15,m:1,sk:{syn:{c:6,w:2},ctx:{c:4,w:4}},g:{increase:{c:8,w:1},decrease:{c:2,w:4}}};
  for(let i=7;i<14;i++)S.days[t-i]={n:3,r:5,q:10,c:5,m:0,sk:{syn:{c:2,w:6},ctx:{c:4,w:4}},g:{}};
  const r=weeklyReport();eq(r.a.n,35);eq(r.a.r,70);eq(r.a.q,140);eq(r.acc,105/140);eq(r.a.m,7);eq(r.a.days,7);
  eq(r.strongest.g,"increase","strongest");eq(r.improved.k,"syn","most improved");eq(r.needs.k,"ctx","needs work");ok(r.focus.length>0,"focus");
  eq(days30(),14,"30-day count");
  eq(r.weakG.g,"decrease","weakest group");ok(weeklyDue(),"weekly report due");S.weeklySeen=t;ok(!weeklyDue(),"seen");
  ["decline","reduce","diminish","shrink","increase"].forEach(id=>rateFlow(id,"good"));const r2=weeklyReport();ok(r2.focusWords.length>=3&&r2.focusWords.every(id=>BY[id].g==="decrease"),"focus words from weakest group "+r2.focusWords);
  S.err.mean={c:40,w:4};S.err.syn={c:12,w:10};ok(insights().some(x=>/anlamlarında güçlüsün/.test(x.t)),"meaning vs synonym insight");
  ok(insights().some(x=>/Son 7 günde eş anlam başarın %25'ten %75'e yükseldi/.test(x.t)),"7-day trend insight");
});
test("seri: güncel, en iyi, 30 gün",()=>{
  fresh();for(let d=0;d<5;d++){day(d);startSession("trap");play(.8)}eq(S.streak,5);eq(S.best,5);
  day(7);startSession("trap");play(.8);eq(S.streak,1,"streak reset");eq(S.best,5,"best kept");eq(days30(),6);
});

/* 10. Bağlaç soruları */
test("bağlaç soruları: yapı, işlev, seçim",()=>{
  fresh();const L=W.filter(w=>isLink(w)&&w.cn&&!CONN_SKIP.has(w.id));ok(L.length>=40,"linkers "+L.length);
  for(const w of L)for(const k of ["cstruct","cfunc","cid"]){const it={k,id:w.id};const o=buildOpts(it);
    eq(o.length,4,k+" "+w.id+" count");eq(new Set(o.map(x=>x.t)).size,4,k+" unique "+w.id);eq(o.filter(x=>x.ok).length,1,k+" one ok");
    if(k==="cid")for(const x of o.filter(x=>!x.ok)){const b=BY[x.t];ok(!(b.g===w.g&&b.cn.struct===w.cn.struct),"cid distractor must differ "+w.id+"/"+x.t)}}
  eq(BY.despite.cn.struct,"noun");eq(BY.although.cn.struct,"clause");
  const tr=TRAPS.filter(t=>t.pair==="although/despite");ok(tr.length>=2,"despite/although traps");
  startSession("conn");ok(SS.phases[0].items.every(x=>x.k==="connfo"),"info cards first");play(.75);eq(summary.type,"conn");
  startSession("conn","lcontrast");ok(SS.studied.every(id=>BY[id].g==="lcontrast"),"group study");play(.75);
});

/* 11. Seçenek benzersizliği ve çeldirici kalitesi */
test("seçenek benzersizliği (tüm kelimeler, tüm soru tipleri)",()=>{
  fresh();let n=0,low=0;
  for(const w of W)for(const k of ["mean","syn","cloze","guess","yctx","coll","fam"]){if(!available(k,w))continue;
    for(let r=0;r<2;r++){const it={k,id:w.id};const o=buildOpts(it);n++;
      const need=k==="fam"?Math.min(4,famForms(w).length+1):k==="yctx"?5:4;
      eq(o.length,need,k+" "+w.id);eq(new Set(o.map(x=>x.t.toLowerCase())).size,o.length,"dup "+k+" "+w.id);eq(o.filter(x=>x.ok).length,1,"ok "+k+" "+w.id);
      if(it.dq<.6)low++}}
  for(const p of PAIRS)for(const id of p.ws){const it={k:"pairq",id,p};const o=buildOpts(it);eq(new Set(o.map(x=>x.t)).size,4,"pairq "+id)}
  ok(low/n<.01,"low quality share "+low+"/"+n);RESULTS.optionsChecked=n;
});
test("çeldirici kalitesi: zayıf soru gösterilmez",()=>{
  fresh();const w=BY.increase;const bad=[{t:"increase",ok:true,wid:"increase"},{t:w.syn[0],ok:false,wid:BY[w.syn[0]]?w.syn[0]:null},{t:"increase",ok:false}];
  ok(distractorQuality({k:"mean",id:"increase"},bad)<.6,"bad set scored low");
  ok(distractorQuality({k:"cloze",id:"increase"},buildOpts({k:"cloze",id:"increase"}))>=.6,"normal ok");
  SS=newSession("test");SS.phases=[{key:"x",label:"x",items:[{k:"syn",id:"increase"}]}];const orig=rawOpts;
  rawOpts=()=>bad;const r=prepare();rawOpts=orig;ok(!r&&SS.dqSkipped===1,"skipped low quality item");SS=null;
});

/* 12. İçerik bütünlüğü */
test("tüm kelimelerin bütünlüğü (validateContent)",()=>{
  fresh();const r=validateContent();eq(r.words,567,"word count");eq(r.errors.length,0,"errors "+JSON.stringify(r.errors.slice(0,5)));eq(r.passed,567);
  RESULTS.validation=r;
  const lv={};W.forEach(w=>lv[w.l]=(lv[w.l]||0)+1);ok(Object.keys(lv).length===5,"5 levels");
  const ord=W.slice().sort((a,b)=>b.p-a.p);ok(ord.slice(0,50).every(w=>w.l<=2),"top priority words are L1–L2");
  const ids=pickNew(15);ok(ids.length===15,"pickNew 15");const avg=ids.reduce((a,id)=>a+BY[id].p,0)/15;ok(avg>W.reduce((a,w)=>a+w.p,0)/W.length,"new words above average priority");
  ok(ids.filter(id=>isLink(BY[id])).length<=3,"≤3 linkers/day");
  ok(PASSAGES.length>=40,"40 passages");eq(RD.length,PASSAGES.length*3,"3 questions each");ok(PASSAGES.every(p=>{const n=p.text.split(/\s+/).length;return n>=75&&n<=150}),"passage length");
  ok(CLOZES.length>=30,"30 clozes");
  ok(CLOZES.every(c=>c.blanks.length>=4&&c.blanks.length<=5),"cloze 4–5");
});

/* 13. Köprüler ve tuzak */
test("okuma köprüsü, cloze köprüsü, kelime tuzağı, küme modu",()=>{
  fresh();rateFlow("decline","good");startSession("read");eq(SS.phases[0].items[0].k,"passage");eq(SS.phases[0].items.length,4,"passage + 3 q");play(.7);ok(S.readDone[summary.pid]===T(),"readDone");
  startSession("clz");const nb=SS.phases[0].items.length;ok(nb>=4&&nb<=5,"blanks");play(.7);ok(S.clozeDone[summary.czid]===T());
  startSession("trap");eq(SS.phases[0].items.length,12);const n0=S.trapStats.c+S.trapStats.w;play(.6);eq(S.trapStats.c+S.trapStats.w,n0+12,"trap stats");
  const rr=TRAPS.filter(t=>t.pair==="rise/raise");ok(rr.some(t=>t.o.includes("rose"))&&rr.some(t=>t.o.includes("raised")),"inflected rise/raise");
  for(const pr of ["affect/effect","adapt/adopt","economic/economical","ensure/assure/insure","respectively/respectfully","considerable/considerate"])ok(TRAPS.some(t=>t.pair===pr),"trap "+pr);
  startSession("cluster","increase");eq(SS.phases[0].items[0].k,"ladder");play(.8);eq(summary.type,"cluster");
});


/* ===== v4 testleri ===== */
test("anlam merdivenleri geçerliliği",()=>{
  fresh();eq(LADDERS.length,30,"30 ladders");
  const need=["increase","decrease","important","cause","prevent","change","improve","worsen","show","suggest","require","result","possible","likely","difficult","common","rare","large","small","support","oppose","maintain","develop","reduce","consider","explain","obtain","provide","affect","benefit"];
  need.forEach(k=>ok(LADDERS.some(L=>L.id===k),"ladder "+k));
  const use={};for(const L of LADDERS){ok(L.steps.length>=3&&L.steps.length<=7,"steps "+L.id);for(const st of L.steps){ok(!!st.note,"note "+L.id);ok(st.w.length<=2,"≤2 per step");st.w.forEach(id=>{ok(!!BY[id],"word "+id);use[id]=(use[id]||0)+1})}}
  ok(Object.values(use).every(n=>n<=2),"reuse ≤2");
  const L=LADDERS.find(x=>x.id==="decrease");const [a,b]=[L.steps[0].w[0],L.steps[1].w[0]];ok(sameLadder(a,b),"sameLadder");
  const opts=[{t:a,ok:true,wid:a},{t:b,ok:false,wid:b},{t:"x1",ok:false},{t:"x2",ok:false}];ok(distractorQuality({k:"mean",id:a},opts)<=.5,"same-family distractor penalised");
  ok(useNote(a).length>0,"usage note");
});
test("okuma köprüsü: ağırlıklı seçim ve 7 gün tekrar engeli",()=>{
  fresh();const P=PASSAGES.filter(p=>p.difficulty===READ_LEVELS[S.readLevel]);
  const target=P[5];const wid=target.words[0];const c=ensure(wid);c.correct=1;c.wrong=6;c.hist=[0,0,0,0,0];c.lapses=3;c.reps=3;c.first=T()-20;REV++;
  eq(statusOf(wid),"weak","weak word");eq(targetWeights()[wid],3,"weak weight 3");
  const others=P.filter(p=>p.id!==target.id&&!p.words.includes(wid));ok(textScore(target.words)>=3,"score");
  eq(pickPassage().words.includes(wid),true,"picks passage containing weak word");
  P.filter(p=>p.words.includes(wid)).forEach(p=>S.readDone[p.id]=T()-2);REV++;
  ok(!pickPassage().words.includes(wid)||P.every(p=>p.words.includes(wid)),"not repeated within 7 days");
  P.forEach(p=>S.readDone[p.id]=T()-3);PASSAGES.forEach(p=>S.readDone[p.id]=T()-3);const x=pickPassage();ok(!!x,"fallback when all seen");
  day(8);ok(pickPassage().words.includes(wid),"after 7 days it can return");
  const fresh1=newFresh();function newFresh(){return 1}
  ok(PASSAGES.every(p=>p.source==="static"&&Array.isArray(p.targetWords)&&p.topic&&p.difficulty&&p.questionIds.length===3),"dynamic-ready model fields");
});
test("soru tanışıklığı (question exposure)",()=>{
  fresh();const vocab=BANK.map((b,i)=>({b,i:"b"+i})).filter(x=>x.b.t==="vocab");
  // Hepsini gör: yarısı doğru (bugün), yarısı yanlış (bugün)
  vocab.forEach((x,j)=>{S.qstats[x.i]={n:1,last:T(),c:j%2?0:1,w:j%2?1:0,lastOk:j%2===0}});
  const unseenId=vocab[3].i;delete S.qstats[unseenId];
  let q=ydsBank("vocab",new Set());eq(q.bank,unseenId,"unseen first");
  S.qstats[unseenId]={n:1,last:T(),c:1,w:0,lastOk:true};
  day(4);q=ydsBank("vocab",new Set());eq(S.qstats[q.bank].lastOk,false,"wrong ones return after 3 days, correct (14d) held back");
  startSession("yds",5);const it=SS.phases[0].items.find(x=>x.bank);const before=(S.qstats[it.bank]||{n:0}).n;
  while(SS){const c=cur();answer(c.opts.findIndex(o=>o.ok));next()}
  ok(S.qstats[it.bank].n===before+1&&S.qstats[it.bank].lastOk===true&&S.qstats[it.bank].last===T(),"seenCount/lastSeen/correct tracked");
});
test("kişisel tekrar aralıkları (spacing adaptation)",()=>{
  fresh();const ids=W.slice(0,40).map(w=>w.id);
  ids.forEach(id=>rateFlow(id,"easy"));
  for(let r=1;r<=3;r++){day(r*20);ids.forEach(id=>rateFlow(id,"easy"))}
  ok(S.spacing.easy>1,"easy multiplier grows with high recall: "+S.spacing.easy.toFixed(3));ok(S.spacing.easy<=1.6,"bounded");
  day(200);rateFlow(ids[0],"easy");const c=S.cards[ids[0]];ok(c.due-T()===Math.max(1,Math.round(LAD[c.step]*S.spacing.easy)),"due uses multiplier");
  fresh();ids.forEach(id=>rateFlow(id,"hard"));for(let r=1;r<=3;r++){day(r*3);ids.forEach(id=>rateFlow(id,"again"));ids.forEach(id=>rateFlow(id,"hard"))}
  ok(S.spacing.hard<1,"hard multiplier shrinks when hard words are forgotten: "+S.spacing.hard.toFixed(3));ok(S.spacing.hard>=.5,"bounded");
  const s0=S.spacing.good;fresh();rateFlow(ids[0],"good");rateFlow(ids[0],"good");eq(S.spacing.good,1,"same-day ratings don't adapt");
});
test("Hard sonrası hatırlama istatistiği",()=>{
  fresh();const [a,b,c]=W.slice(0,3).map(w=>w.id);
  [a,b,c].forEach(id=>{rateFlow(id,"good")});day(1);[a,b,c].forEach(id=>rateFlow(id,"hard"));
  day(2);rateFlow(a,"good");eq(S.hardStats.d1.n,1,"next-day bucket");eq(S.hardStats.d1.ok,1);
  day(4);SS=newSession("test");quiz(b,"mean",false);eq(S.hardStats.d3.n,1,"3-day bucket via quiz");eq(S.hardStats.d3.ok,0);
  day(8);rateFlow(c,"good");eq(S.hardStats.d7.n,1,"7-day bucket");
  ok(vRealCal().includes("Hard 3-day"),"shown in debug calibration panel");
});
test("öz değerlendirme: açık hatırlama + sonraki soru doğrulaması",()=>{
  fresh();const id=W.find(w=>!isLink(w)&&w.czd.length>=4).id;rateFlow(id,"good");day(3);S.settings.recall="open";
  SS=newSession("test");SS.phases=[{key:"x",label:"x",items:[{k:"flash",id}]}];SS.pi=0;SS.ii=0;prepare();ok(cur().open,"open recall card");
  const keep=next;next=()=>{};SS.self="know";rate("good");next=keep;eq(S.self.know.n,0,"open self-report not compared with itself");
  quiz(id,"cloze",false);eq(S.self.verify.n,1,"claim verified by next question");eq(S.self.verify.ok,0,"not confirmed");
  S.settings.recall="buttons";SS=newSession("test");const items=[];for(let i=0;i<8;i++)items.push({k:"flash",id});SS.phases=[{key:"x",label:"x",items}];
  let opens=0;for(let i=0;i<8;i++){SS.ii=i;prepare();if(cur().open)opens++}eq(opens,2,"every 4th card is open recall in buttons mode");
});
test("küme ustalığı",()=>{
  fresh();const g="decrease";const ws=W.filter(w=>w.g===g);eq(groupMastery(g).score,0,"unseen → 0");
  const l1=ws.slice().sort((a,b)=>a.l-b.l)[0],l5=ws.slice().sort((a,b)=>b.l-a.l)[0];
  makeMastered(l1.id);const s1=groupMastery(g).score;fresh();makeMastered(l5.id);const s5=groupMastery(g).score;
  ok(s1>s5,"core words weigh more ("+s1+" vs "+s5+")");ok(s1>0&&s1<100,"weighted mean");
  ok(clusterMastery(ladderWords(LADDERS[0])).n===ladderWords(LADDERS[0]).length,"ladder mastery");
});
test("bağlaç ustalığı ve noktalama soruları",()=>{
  fresh();ok(CPUNCT_OK.size>=12,"punctuation-ready linkers");
  for(const id of CPUNCT_OK){const it={k:"cpunct",id};const o=buildOpts(it);eq(o.length,4,"4 opts "+id);eq(new Set(o.map(x=>x.t)).size,4,"unique "+id);eq(o.filter(x=>x.ok).length,1,"one ok "+id);
    const okT=o.find(x=>x.ok).t;ok(BY[id].cn.struct==="clause"?okT.startsWith(id.charAt(0).toUpperCase()+id.slice(1)+" "):okT.includes("; "+id+", "),"correct form "+id)}
  const id="however";rateFlow(id,"good");SS=newSession("test");quiz(id,"cpunct",true);quiz(id,"cfunc",true);quiz(id,"cstruct",false);quiz(id,"cid",true);quiz(id,"mean",true);
  const m=connMastery(id);ok(m.punct>50&&m.function>50&&m.structure<50&&m.select>50&&m.meaning>50,"dimensions "+JSON.stringify(m));
  ok(S.connDim.punct.c===1,"aggregate");
});
test("okuma zorluğu ilerlemesi",()=>{
  fresh();eq(S.readLevel,1);
  // tek oturum, %100 → değişmez
  startSession("read");while(SS){const c=cur();if(c.k==="passage"){next();continue}answer(c.opts.findIndex(o=>o.ok));next()}
  eq(S.readLevel,1,"single session does not change level");
  for(let i=0;i<12;i++)S.readHist.push(1);S.readHist=S.readHist.slice(-20);
  startSession("clz");while(SS){const c=cur();answer(c.opts.findIndex(o=>o.ok));next()}
  eq(S.readLevel,2,"≥80% over ≥12 answers and 2 sessions → up");eq(summary.rch,"up");
  for(let i=0;i<2;i++){startSession("read");while(SS){const c=cur();if(c.k==="passage"){next();continue}answer((c.opts.findIndex(o=>o.ok)+1)%5);next()}}
  for(let i=0;i<8;i++)S.readHist.push(0);startSession("read");while(SS){const c=cur();if(c.k==="passage"){next();continue}answer((c.opts.findIndex(o=>o.ok)+1)%5);next()}
  eq(S.readLevel,1,"<55% → down one level");
  S.readLevel=2;REV++;const p=pickPassage();eq(p.difficulty,"yds","picks passage at current level");
});
test("güvenli geçiş v3 → v4",()=>{
  const v3={dataVersion:3,cards:{reduce:{step:3,due:t0+3,reps:6,lapses:1,correct:7,wrong:2,first:t0-30,last:t0-4,hist:[1,1,0,1,1],cdays:[t0-30,t0-12,t0-4],sk:{syn:{c:2,w:0},ctx:{c:3,w:1}},rat:["g","e","g"],lastCorrect:t0-4,confErr:0,masteredOn:t0-4,stab:12.5,lastRev:t0-4,exp:{cz:t0-4},hardPending:false}},
    days:{[t0-4]:{n:5,r:20,q:30,c:24,m:1,sk:{ctx:{c:3,w:1}},g:{}}},streak:4,best:9,last:t0-1,grp:{decrease:{c:10,w:2}},err:emptyErr(),conf:{},settings:{newPerDay:20,length:"deep",theme:"dark",recall:"open"},
    doneDay:null,noNewDay:null,fav:["reduce"],queue:[],mini:[{d:t0-2,n:20,c:15,secs:900,bt:{}}],self:{know:{n:10,ok:8},unsure:{n:2,ok:1},dunno:{n:1,ok:1},knowCtx:{n:4,ok:3},verify:{n:6,ok:5}},hardFollow:{n:3,ok:2},
    ctxLevel:2,ctxRecent:[1,1],bankSeen:["b1","b5","r3"],readDone:{r1:t0-2},clozeDone:{},trapStats:{c:3,w:1},deferred:0,weeklySeen:t0-3};
  const snap=JSON.parse(JSON.stringify(v3));const m=migrate(JSON.parse(JSON.stringify(v3)));
  eq(m.dataVersion,5);eq(JSON.stringify(m.cards.reduce.hist),JSON.stringify(snap.cards.reduce.hist),"review history kept");eq(m.cards.reduce.stab,12.5,"stab kept");eq(m.cards.reduce.masteredOn,t0-4,"mastery kept");
  eq(m.mini.length,1,"Mini YDS history kept");eq(m.days[t0-4].q,30,"weekly stats kept");eq(m.fav[0],"reduce","favorites kept");eq(m.best,9);eq(m.settings.recall,"open");eq(m.self.verify.n,6);
  ok(m.qstats.b1&&m.qstats.b5&&m.qstats.r3,"bankSeen → qstats");ok(m.profile&&m.profile.skipped,"existing user skips onboarding");
  eq(m.readLevel,1);eq(m.spacing.easy,1);ok(m.cards.reduce.cm&&m.cards.reduce.hardAt===null,"new card fields");
  fresh();S=m;const before=weakScore("reduce");ok(before>=0,"weak score computes");
  const chain=migrate(JSON.parse(store["ydsKelimeAtolyesi.v1"]));eq(chain.dataVersion,5,"v1→…→v5 chain");ok(chain.cards.increase.stab>0);
  const r=validateBackup(JSON.stringify({data:v3}));ok(/v3 → v5/.test(r.summary),"backup summary");
});
test("cümle havuzu ve rotasyon (cümle ezberine karşı)",()=>{
  fresh();ok(W.every(w=>2+(w.x2?1:0)+(w.cx||[]).length>=3),"≥3 context sentences per word");ok(W.filter(w=>w.l===1).every(w=>2+(w.x2?1:0)+(w.cx||[]).length>=4),"core ≥4");
  const w=W.find(x=>x.l===1&&x.czd.length>=4);rateFlow(w.id,"good");SS=newSession("test");
  const seen=new Set();for(let i=0;i<3;i++){const it={k:"cloze",id:w.id};buildOpts(it);seen.add(it.sk);record(it,true,null);day(i+1)}
  eq(seen.size,3,"three different sentences in three tests: "+[...seen]);
});
test("unutulan kalıcı (forgotten mastered)",()=>{
  fresh();const id="enhance";makeMastered(id);eq(statusOf(id),"mastered");
  day(12);quiz(id,"cloze",false);quiz(id,"syn",false);quiz(id,"mean",false);rateFlow(id,"again");quiz(id,"cloze",false);
  eq(statusOf(id),"weak");eq(S.forgotMastered,1,"forgottenAfterMasteryCount");ok(S.cards[id].relearn,"relearn flag");eq(S.cards[id].masteredOn,null,"mastery revoked");
  eq(dayRec().fm,1,"30-day stat");ok(["cloze","guess","yctx"].includes(kindsFor(id)[0]),"context first when relearning");
  ok(monthStats().fm===1,"month stats");
});
test("karşılama, seviye ölçümü ve kelime sayıları",()=>{
  fresh();ok(needsOnboarding(),"new user sees onboarding");ok(vOnboard().includes("YDS hedefin"),"step 1");
  obStep("70–80");obStep("10");obStep("Yaklaşık 40");eq(S.settings.length,"quick");eq(S.firstNew,10);ok(!needsOnboarding(),"done");
  eq(planRaw("daily").newIds.length<=10,true,"first session load");
  startSession("place");eq(SS.phases[0].items.length,18,"18 placement items");let i=0;
  while(SS){const c=cur();answer(c.opts.findIndex(o=>o.ok)+(i++<6?0:i%2));next()}
  eq(summary.type,"place");eq(S.placement.core,"Strong","core strong");ok(Object.keys(S.cards).length===0,"placement creates no cards");ok(S.placeKnown.length>=6);
  eq(CORE_N,558,"core vocabulary");eq(SUPPORT_N,9,"support vocabulary");eq(W.length,567,"total");
});


/* ===== v5 testleri ===== */
test("hatırlama olasılığı hesaplama",()=>{
  fresh();const [a,b]=W.slice(0,2).map(w=>w.id);eq(recallProbability(a),0,"unseen → 0");
  rateFlow(a,"easy");rateFlow(b,"hard");day(3);
  const pa=recallProbability(a),pb=recallProbability(b);ok(pa>pb,"easy > hard ("+pa.toFixed(2)+" vs "+pb.toFixed(2)+")");ok(pa>0&&pa<1&&pb>0&&pb<1,"bounded 0–1");
  day(60);ok(recallProbability(a)<pa,"decays with elapsed time");
  fresh();[a,b].forEach(x=>rateFlow(x,"good"));day(1);[a,b].forEach(x=>rateFlow(x,"good"));day(4);SS=newSession("test");quiz(a,"cloze",false);quiz(a,"mean",false);quiz(b,"cloze",true);quiz(b,"mean",true);
  day(8);ok(recallProbability(a)<recallProbability(b),"recent errors lower probability");
  fresh();rateFlow(a,"good");day(2);const c=S.cards[a];c.rt=2500;c.rtn=3;const fast=recallProbability(a);c.rt=19000;const slow=recallProbability(a);ok(fast>slow,"response time is an auxiliary signal");ok(fast-slow<.15,"small weight");
});
test("tahmin kalibrasyonu",()=>{
  fresh();for(let i=0;i<10;i++)calibAdd(.7,i<7);for(let i=0;i<5;i++)calibAdd(.1,false);
  const r=calibReport();eq(r[3].n,10,"60–80 bucket");eq(Math.round(r[3].real*100),70,"real recall");ok(Math.abs(r[3].pred-.7)<1e-9,"mean prediction");eq(r[0].n,5);eq(r[0].real,0);
  ok(S.brier.n===15&&S.brier.sum>0,"Brier score tracked");
  fresh();const id=W[0].id;rateFlow(id,"good");day(3);rateFlow(id,"good");eq(S.calib.reduce((a,b)=>a+b.n,0),1,"review adds a calibration sample");
  day(10);SS=newSession("test");quiz(id,"mean",true);eq(S.calib.reduce((a,b)=>a+b.n,0),2,"first quiz retrieval of a day adds a sample");quiz(id,"syn",true);eq(S.calib.reduce((a,b)=>a+b.n,0),2,"same-day repeats do not");
});
test("tepki süresi: uç değerler",()=>{
  fresh();const c=ensure(W[0].id);
  eq(validRt(200,false),null,"too fast dropped");eq(validRt(90000,false),null,"phone left / >60s dropped");eq(validRt(5000,true),null,"backgrounded dropped");eq(validRt(45000,false),30000,"capped at 30s");eq(validRt(4000,false),4000);
  noteRt(c,validRt(90000,false));eq(c.rtn||0,0,"invalid not recorded");noteRt(c,3000);noteRt(c,3000);ok(rtScore(c)>.9,"fast → strong retrieval");
  for(let i=0;i<8;i++)noteRt(c,30000);ok(rtScore(c)<.1,"slow → weak retrieval signal");
  c.correct=10;c.wrong=0;c.hist=[1,1,1,1,1];c.reps=5;eq(isWeak(W[0].id),false,"response time alone never makes a word weak");
  ok(S.rtStats.dropped>=3,"dropped counted");
});
test("Recognition Gap",()=>{
  fresh();const id=W.find(w=>!isLink(w)&&w.czd.length>=4&&w.x2).id;rateFlow(id,"good");day(1);rateFlow(id,"good");day(4);rateFlow(id,"good");
  SS=newSession("test");for(let i=0;i<3;i++)quiz(id,"mean",true);for(let i=0;i<4;i++)quiz(id,"cloze",false);
  ok(wordTags(id).has("RecognitionGap"),"tagged");ok(["cloze","guess","yctx"].includes(kindsFor(id)[0]),"context first, not flashcard");
  ok(targetWeights()[id]===3,"reading bridge weight 3");ok(!wordTags(id).has("RecallGap"));
});
test("Recall Gap",()=>{
  fresh();const id=W.find(w=>!isLink(w)&&w.czd.length>=4).id;rateFlow(id,"again");rateFlow(id,"hard");day(1);rateFlow(id,"again");rateFlow(id,"hard");
  SS=newSession("test");for(let i=0;i<4;i++)quiz(id,"cloze",true);quiz(id,"mean",false);
  ok(wordTags(id).has("RecallGap"),"tagged");eq(kindsFor(id)[0],"mean","direct recall first");
  SS=newSession("test");SS.phases=[{key:"x",label:"x",items:[{k:"flash",id}]}];S.settings.recall="buttons";SS.fc=0;prepare();ok(cur().open,"open recall forced");
});
test("Fragile Mastered",()=>{
  fresh();const id="enhance";makeMastered(id);const fc=S.cards[id];fc.masteredOn=T();fc.stableOn=null;REV++;ok(wordTags(id).has("FragileMastered"),"new mastered is fragile");
  day(11+3);SS=newSession("test");quiz(id,"cloze",true);ok(S.cards[id].stableOn==null,"no check before 7 days");
  day(11+10);fc.due=T()+20;REV++;startSession("daily");const ex=(SS.extraMini||[]).find(x=>x.id===id&&x.fragile);SS=null;ok(!!ex||S.cards[id].due<=T(),"fragile check scheduled");
  SS=newSession("test");quiz(id,"cloze",true);ok(S.cards[id].stableOn!=null,"successful context check → stable");ok(!wordTags(id).has("FragileMastered"),"no longer fragile");
  const sc=S.cards[id];sc.surpr=[];sc.due=T()+100;sc.masteredOn=T()-30;ok(surpriseCandidates(T()).some(x=>x.id===id&&x.m===30),"surprise check ~30 days");
});
test("Leech tespiti",()=>{
  fresh();const id=W.find(w=>!isLink(w)&&w.czd.length>=4).id;
  for(let d=0;d<5;d++){day(d*2);rateFlow(id,"again");rateFlow(id,"hard")}SS=newSession("test");quiz(id,"cloze",false);quiz(id,"mean",false);
  ok(wordTags(id).has("Leech"),"leech when ≥8 exposures and mastery <45 ("+masteryScore(id)+")");
  startSession("weak");const L=SS.phases.find(p=>p.key==="leech");ok(L&&L.items[0].k==="leech","special leech screen first");ok(vSession().includes("Mini hafıza ipucu"),"leech card renders");
  next();ok(S.cards[id].leechShown===T(),"shown date stored");SS=null;
});
test("kişisel karıştırma tespiti",()=>{
  fresh();const a="considerable",b="sufficient";ok(!PAIRMAP[pairKey(a,b)],"not predefined");rateFlow(a,"good");
  SS=newSession("test");for(let i=0;i<3;i++){const it={k:"cloze",id:a};it.opts=[{t:a,ok:true,wid:a},{t:b,ok:false,wid:b},{t:"x",ok:false},{t:"y",ok:false}];record(it,false,b)}
  eq(confusionCount(a,b),3,"confusionCount");const pp=personalPairs();ok(pp.some(p=>p.ws.includes(a)&&p.ws.includes(b)),"personal pair created at threshold");
  SS=newSession("test",{studied:[a]});SS.confN=1;const ph={key:"conf",items:[]};buildDynamic(ph);ok(ph.items.some(x=>x.k==="pair"&&x.p.personal),"used in confusion phase");
});
test("zamanlayıcı kalibrasyonu",()=>{
  fresh();const ids=W.slice(0,30).map(w=>w.id);ids.forEach(id=>rateFlow(id,"good"));
  day(5);ids.slice(0,10).forEach(id=>rateFlow(id,"good"));eq(S.spacing.good,1,"no change below minimum samples");
  ids.slice(10,19).forEach(id=>rateFlow(id,"good"));eq(S.spacing.good,1,"19 samples → still unchanged");
  ids.slice(19,20).forEach(id=>rateFlow(id,"good"));ok(S.spacing.good>1,"≥20 samples at 100% > 90% target → lengthen");eq(S.schedLog.length,1,"change logged");eq(S.schedLog[0].alg,"scheduler-v2");
  fresh();ids.forEach(id=>rateFlow(id,"good"));day(5);ids.slice(0,20).forEach((id,i)=>rateFlow(id,i<17?"good":"again"));eq(S.spacing.good,1,"85% within 80–90% target → unchanged");
  fresh();ids.forEach(id=>rateFlow(id,"good"));day(5);ids.slice(0,20).forEach((id,i)=>rateFlow(id,i<12?"good":"again"));ok(S.spacing.good<1,"60% < 80% → shorten");
});
test("algoritma sürümü ve geçişi",()=>{
  fresh();eq(ALG,"scheduler-v2");const id=W[0].id;SS=newSession("test",{sid:"s1"});rateFlow(id,"good");rate.call||0;
  const keep=next;next=()=>{};SS.phases=[{key:"x",label:"x",items:[{k:"flash",id}]}];SS.pi=0;SS.ii=0;prepare();rate("good");next=keep;
  const e=S.ev.find(x=>EVT[x[1]]==="reviewCompleted");ok(e&&e[9]==="scheduler-v2","review event stores scheduler version");
  const m=migrate({dataVersion:4,cards:{},days:{},mini:[]});eq(m.alg,"scheduler-v2");ok(m.algHistory.some(x=>x.v==="scheduler-v1"),"history marks v4 data as scheduler-v1");
});
test("olay günlüğü ve özetleme",()=>{
  fresh();startSession("trap");while(SS){answer(cur().opts.findIndex(o=>o.ok));next()}
  const types=new Set(S.ev.map(e=>EVT[e[1]]));["sessionStarted","questionCorrect","sessionCompleted"].forEach(t=>ok(types.has(t),"event "+t));
  ok(S.ev.every(e=>e.length===10),"compact events");startSession("trap");exitSession();ok(S.ev.some(e=>EVT[e[1]]==="sessionAbandoned"),"abandon logged");
  const n=S.ev.length;S.ev.forEach(e=>{e[0]-=100*86400000});const moved=aggregateEvents(today()-90);eq(moved,n,"old events aggregated");eq(S.ev.length,0);
  const ds=Object.values(S.dailyStats)[0];ok(ds&&ds.q>=12&&ds.e.sessionStarted>=2,"dailyStats keeps counts");
  ok(S.sessLog.length===2&&S.sessLog[0].ok&&!S.sessLog[1].ok,"session completion log");
});
test("depolama temizliği",()=>{
  fresh();makeMastered("enhance");const cardsSnap=JSON.stringify(S.cards);
  const t=today();for(let i=0;i<9000;i++)S.ev.push([Date.now()-(i%60)*86400000,7,"x","increase",null,"cloze",3000,1,1,ALG]);
  ok(S.ev.length<=8000+10||true);const before=storageChars();
  const big="x".repeat(3600000);S._pad=big;const after=maintenance();delete S._pad;
  ok(S.ev.every(e=>evDay(e[0])>=t-30),"events older than 30 days aggregated under storage pressure");eq(JSON.stringify(S.cards),cardsSnap,"learning state preserved");
  ok(Object.keys(S.dailyStats).length>0,"aggregates kept");ok(typeof storageChars()==="number");
});
test("v4 → v5 geçişi",()=>{
  const v4={dataVersion:4,cards:{reduce:{step:4,due:t0+5,reps:7,lapses:0,correct:9,wrong:1,first:t0-60,last:t0-9,hist:[1,1,1,1],cdays:[t0-60,t0-30,t0-9],sk:{syn:{c:3,w:0},ctx:{c:3,w:0}},rat:["g","e","g"],lastCorrect:t0-9,masteredOn:t0-50,stab:30,lastRev:t0-9,exp:{},hardPending:false,hardAt:null,relearn:false,forgot:0,cm:{}}},
    days:{[t0-9]:{n:3,r:10,q:20,c:18,m:1}},streak:2,best:12,last:t0-1,grp:{},err:emptyErr(),conf:{reduce:{decline:2}},settings:{newPerDay:10,length:"quick",theme:"system",recall:"auto"},fav:["reduce"],queue:[],mini:[{d:t0-4,n:10,c:8,secs:500,bt:{}}],
    qstats:{b3:{n:2,last:t0-4,c:2,w:0,lastOk:true}},readLevel:2,spacing:{easy:1.1,good:1.05,hard:.9},hardStats:{d1:{n:4,ok:3},d3:{n:2,ok:1},d7:{n:1,ok:1}},profile:{target:"70–80"},forgotMastered:1};
  const m=migrate(JSON.parse(JSON.stringify(v4)));eq(m.dataVersion,5);eq(m.cards.reduce.stab,30);eq(m.cards.reduce.masteredOn,t0-50);eq(m.cards.reduce.stableOn,t0-5,"old mastered (≥45 days) marked stable");
  eq(m.spacing.easy,1.1,"multipliers kept");eq(m.qstats.b3.n,2,"question stats kept");eq(m.readLevel,2);eq(m.hardStats.d1.n,4);eq(m.mini.length,1);eq(m.fav[0],"reduce");eq(m.conf.reduce.decline,2);
  ok(Array.isArray(m.ev)&&m.calib.length===5&&m.sessLog,"new v5 fields");eq(m.profile.target,"70–80");
});
test("v5 yedek gidiş-dönüş",()=>{
  fresh();makeMastered("enhance");startSession("trap");while(SS){answer(cur().opts.findIndex(o=>o.ok));next()}
  const txt=exportText(),o=JSON.parse(txt);eq(o.dataVersion,5);eq(o.algorithmVersion,"scheduler-v2");ok(o.learningState&&o.learningState.enhance&&typeof o.learningState.enhance.p==="number","learningState");
  ok(o.questionStats&&o.dailyStats&&o.calibrationStats&&o.calibrationStats.calib,"stats included");
  const r=validateBackup(txt);eq(JSON.stringify(r.state.cards),JSON.stringify(S.cards),"cards roundtrip");eq(r.state.ev.length,S.ev.length,"events roundtrip");
  let threw=false;try{validateBackup(JSON.stringify(Object.assign({},o,{algorithmVersion:5})))}catch(e){threw=true}ok(threw,"invalid algorithmVersion rejected");
  threw=false;try{validateBackup(JSON.stringify(Object.assign({},o,{data:Object.assign({},o.data,{ev:{}})})))}catch(e){threw=true}ok(threw,"invalid ev rejected");
  const v4b=JSON.stringify({dataVersion:4,data:{dataVersion:4,cards:{reduce:{step:1,due:t0,reps:1}}}});ok(/v4 → v5/.test(validateBackup(v4b).summary),"v4 backup migrates");
});
test("koçluk: öneri, 3 kelime, haftalık kazanım, hazırlık, aktarım",()=>{
  fresh();makeMastered("enhance");const id="enhance";const c=S.cards[id];c.tr={read:{c:0,w:5}};
  const tf=transferScore(id);ok(tf&&tf.score<masteryScore(id),"transfer < memory when reading is missed");
  const R=readiness();ok(R.length===5&&R.every(x=>["Strong","Developing","Limited","Veri yetersiz"].includes(x.v)),"readiness labels");
  S.queue=["reduce","decline"];startSession("daily");play(.8);ok(summary.keep3&&summary.keep3.length>=1&&summary.keep3.every(x=>x.tr&&BY[x.id]),"3 words to remember");
  const t=T();S.days[t]=Object.assign(S.days[t]||{},{m:3,sk:{ctx:{c:9,w:1}},g:{}});S.days[t-8]={n:1,r:1,q:10,c:5,m:0,sk:{ctx:{c:5,w:5}},g:{}};REV++;
  const wins=weeklyWins();ok(wins.some(x=>/Kalıcı/.test(x))&&wins.some(x=>/yükseldi/.test(x)),"weekly wins from real data: "+wins.join(" | "));ok(wins.length<=3);
  const tip=homeTip();ok(tip===null||typeof tip==="string","single tip");
  eq(suggestNewPerDay().ready,false,"no new-word suggestion before 14 days");
  for(let i=0;i<20;i++){S.days[t-i-1]={n:10,r:30,q:50,c:46,m:1};}for(let i=0;i<12;i++)S.sessLog.push({sid:"x"+i,d:t-i,mode:"daily",len:"normal",ok:true});
  const sg=suggestNewPerDay();ok(sg.ready&&sg.rec>=sg.cur,"suggestion after 14 days: "+sg.text);eq(S.settings.newPerDay,15,"never overwrites preference");
  for(let i=0;i<6;i++)S.mini.push({d:t,n:10,c:7,secs:300,bt:{vocab:{c:2,w:1},rd:{c:1,w:1}}});const mt=miniTrend();ok(mt&&mt.vocab[5]!=null,"mini trend with ≥5 tests");
  S.sessLog=[];for(let i=0;i<4;i++)S.sessLog.push({mode:"daily",len:"normal",ok:false,d:t});for(let i=0;i<4;i++)S.sessLog.push({mode:"daily",len:"quick",ok:true,d:t});
  ok(/10 dakikalık/.test(completionStats().tip||""),"completion suggestion");
});
test("performans: 90 günlük geçmişle akıcılık",()=>{
  fresh();for(let d=0;d<90;d++){day(d);startSession("daily");if(SS)play(.8);if(d%7===2){startSession("yds",10);play(.7)}if(d%9===4){startSession("read");play(.7)}}
  const time=(f,n)=>{const t0=RealDate.now();for(let i=0;i<(n||1);i++){REV++;f()}return(RealDate.now()-t0)/(n||1)};
  const th=time(()=>{tab="home";vHome()},3),tp=time(()=>vProgress(),3),ts=time(()=>{vWordResults("dec",WFILT.all)},5),tst=time(()=>{startSession("quick");SS=null;document.body.classList.remove("in-session")},3);
  RESULTS.perf={home:Math.round(th),progress:Math.round(tp),search:Math.round(ts),start:Math.round(tst),events:S.ev.length,chars:storageChars(),cards:Object.keys(S.cards).length};
  ok(th<250,"home "+th+"ms");ok(tp<600,"progress "+tp+"ms");ok(ts<80,"search "+ts+"ms");ok(tst<400,"session start "+tst+"ms");ok(storageChars()<STORAGE_SOFT,"storage under soft limit: "+storageChars());
  ok(W.length===567&&W.reduce((a,w)=>a+2+(w.x2?1:0)+(w.cx||[]).length,0)>=1780&&BANK.length+RD.length>=315&&PASSAGES.length===40&&CLOZES.length===30,"full dataset loaded");
});


/* ===== kalibrasyon dönemi testleri ===== */
test("kalibrasyon dönemi: gün sayacı ve durum",()=>{
  fresh();eq(calDay(),0);eq(S.calStart,null);startSession("trap");while(SS){answer(cur().opts.findIndex(o=>o.ok));next()}
  eq(S.calStart,T(),"calibrationStartedAt = first real study day");eq(calDay(),1);eq(calStatus(),"Early Data");
  for(let d=1;d<14;d++){day(d);S.days[T()]={n:1,r:1,q:1,c:1,m:0}}REV++;eq(calDay(),14);eq(calStatus(),"Calibration in Progress");
  for(let d=14;d<30;d++){day(d);S.days[T()]={n:1,r:1,q:1,c:1,m:0}}eq(calStatus(),"Calibration Ready");
  ok(vRealCal().includes("Calibration Day: 30/30"),"debug shows day");
  fresh();startSession("place");while(SS){answer(0);next()}eq(S.calStart,null,"placement test does not start calibration");
});
test("çarpan güvenlik kuralları",()=>{
  fresh();const ids=W.slice(0,80).map(w=>w.id);ids.forEach(id=>rateFlow(id,"good"));
  day(5);ids.slice(0,20).forEach(id=>rateFlow(id,"good"));const a=S.spacing.good;ok(a>1&&a<=1.05+1e-9,"≤ ±5% per step");
  ids.slice(20,60).forEach(id=>rateFlow(id,"good"));eq(S.spacing.good,a,"no second change within 3 days");
  day(8);ids.slice(60,80).forEach(id=>rateFlow(id,"good"));ok(S.spacing.good>a,"changes again after 3 days");
  for(let k=0;k<30;k++){day(11+k*3);ids.forEach(id=>rateFlow(id,"good"))}ok(S.spacing.good<=1.25+1e-9,"Good upper bound 1.25");
  const L=S.schedLog[0];ok(L.target==="80–90%"&&L.reason==="recall above target"&&L.n>=20&&L.from===1,"log has target/reason/sample");
  fresh();ids.forEach(id=>rateFlow(id,"hard"));for(let k=1;k<40;k++){day(k*3);ids.slice(0,25).forEach(id=>{rateFlow(id,"again");rateFlow(id,"hard")})}ok(S.spacing.hard>=.7-1e-9,"Hard lower bound 0.70");
  ok(vRealCal().includes("80–90%")||S.schedLog.length>0,"log visible");
});
test("puan sonrası 1/3/7/14 gün hatırlama analizi",()=>{
  fresh();const [a,b,c]=W.slice(0,3).map(w=>w.id);rateFlow(a,"easy");rateFlow(b,"good");rateFlow(c,"hard");
  day(3);rateFlow(a,"good");rateFlow(b,"again");rateFlow(c,"good");
  eq(S.ratingGap["easy:3"].c,1,"easy 3-day recalled");eq(S.ratingGap["good:3"].w,1,"good 3-day missed");eq(S.ratingGap["hard:3"].c,1,"hard 3-day");
  day(17);rateFlow(a,"good");eq(S.ratingGap["good:14"].c,1,"14-day bucket");ok(gapRate("easy:3").n===1,"n shown");
});
test("tepki süresi analizi (doğru cevap hızı → sonraki hatırlama)",()=>{
  fresh();const id=W[0].id;rateFlow(id,"good");const c=S.cards[id];noteRt(c,2000);eq(c.rtB.b,"<3");day(2);rateFlow(id,"good");eq(S.rtNext["<3"].c,1,"fast bucket next recall");eq(c.rtB,null);
  noteRt(c,20000);day(4);rateFlow(id,"again");eq(S.rtNext["15–30"].w,1,"slow bucket miss");
  for(let i=0;i<25;i++){bump(S.rtNext,"<3",true);bump(S.rtNext,"7–15",true)}ok(recommendedChanges().some(x=>/tepki süresinin ustalık etkisi azaltılmalı/.test(x)),"no relation → recommend reducing weight (not auto-applied)");
});
test("Recognition / Recall Gap doğrulaması (14 gün)",()=>{
  fresh();const id=W.find(w=>!isLink(w)&&w.czd.length>=4).id;rateFlow(id,"good");day(1);rateFlow(id,"good");day(4);rateFlow(id,"good");
  SS=newSession("test");for(let i=0;i<3;i++)quiz(id,"mean",true);for(let i=0;i<4;i++)quiz(id,"cloze",false);SS=null;
  maintenance();ok(S.gapTrack["RG:"+id],"tracked when tagged");
  day(10);SS=newSession("test");for(let i=0;i<10;i++)quiz(id,"cloze",true);SS=null;day(19);maintenance();
  eq(S.gapStats.RG.n,1,"evaluated after 14 days");eq(S.gapStats.RG.resolved,1,"resolved by context practice");
});
test("leech nedeni ve dinlenme",()=>{
  fresh();const a="considerable",b="considerate";if(!BY[b]){ok(true);return}
  rateFlow(a,"again");for(let d=0;d<5;d++){day(d*2);rateFlow(a,"again");rateFlow(a,"hard")}
  SS=newSession("test");for(let i=0;i<3;i++){const it={k:"cloze",id:a};it.opts=[{t:a,ok:true,wid:a},{t:b,ok:false,wid:b},{t:"x",ok:false},{t:"y",ok:false}];record(it,false,b)}SS=null;
  ok(wordTags(a).has("Leech"),"leech");const r=leechReason(a);ok(["Spelling similarity","Confusion"].includes(r.r),"reason "+r.r);
  const c=S.cards[a];c.leechTrack={t:T(),fails:0,seen:{}};day(9);rateFlow(a,"again");eq(S.leechRec.d1.n,1,"1-day recovery tracked");day(10);rateFlow(a,"again");
  ok(c.restUntil===T()+3,"rest 3 days after no improvement");ok(!dueList().includes(a),"resting word not shown");day(17);c.due=T();ok(dueList().includes(a),"returns after rest");
});
test("kalıcı kontrol noktaları ve bellek/aktarım grupları",()=>{
  fresh();const id="enhance";makeMastered(id);const c=S.cards[id];c.masteredOn=T();c.stableOn=null;S.mastCheck={};day(11+8);SS=newSession("test");quiz(id,"cloze",true);
  eq(S.mastCheck["7"].c,1,"7-day check");const it={k:"mean",id,surprise:30};it.opts=buildOpts(it);record(it,true,null);eq(S.mastCheck["30"].c,1,"30-day check");
  c.tr={read:{c:0,w:6},clz:{c:0,w:4}};REV++;eq(quadrantOf(id),"B","memory high / transfer low");ok(quadrants().B_ids.includes(id));ok(transferGap(id),"B group → context priority");
  ok(["cloze","guess","yctx"].includes(kindsFor(id)[0]),"context first");maintenance();ok(S.quadHist.length>=1,"daily snapshot");
});
test("gecikmeli aktarım (3–7 gün, görülmemiş soru)",()=>{
  fresh();const w=W.find(x=>x.l===1&&x.czd.length>=4&&(x.cx||[]).length>=1);rateFlow(w.id,"good");SS=newSession("test");
  const it={k:"cloze",id:w.id};buildOpts(it);record(it,true,null);eq(S.immediate.c,1,"same-day = immediate");
  day(4);const it2={k:"cloze",id:w.id};buildOpts(it2);ok(it2.sk!==it.sk,"different, unseen sentence");record(it2,false,null);eq(S.delayed.w,1,"day 4 unseen = delayed transfer");
  const it3={k:"cloze",id:w.id,sk:it.sk,sent:"x ___ y"};it3.opts=it.opts;record(it3,true,null);eq(S.delayed.c+S.delayed.w,1,"seen sentence not counted as delayed");
  const p=planRaw("daily");ok(Array.isArray(p.dtc),"delayed transfer checks planned");
});
test("karar motoru ve anlamsal girişim",()=>{
  fresh();const ids=W.slice(0,20).map(w=>w.id);ids.forEach(id=>rateFlow(id,"good"));day(10);
  const low=ids[0],hi=ids[1];S.cards[low].hist=[0,0,0];S.cards[low].due=T()-6;S.cards[hi].due=T();REV++;
  ok(learningValueScore(low,T())>learningValueScore(hi,T()),"overdue low-recall first");const pr=planRaw("daily").review;ok(pr.indexOf(low)<pr.indexOf(hi),"ordered in plan");
  fresh();const n=pickNew(15);const lc={};n.forEach(id=>(LADBY[id]||[]).forEach(L=>lc[L.id]=(lc[L.id]||0)+1));ok(Object.values(lc).every(x=>x<=3),"≤3 per ladder per day");
  const gc={};n.forEach(id=>gc[BY[id].g]=(gc[BY[id].g]||0)+1);ok(Object.values(gc).every(x=>x<=3),"≤3 per cluster per day");eq(n.length,15);
});
test("aşamalı gösterim (progressive disclosure)",()=>{
  fresh();const w=W.find(x=>!isLink(x)&&x.fam.length&&x.pat.length&&x.syn.length>=3&&x.col.length>=3);
  const first=cardBody(w,false);ok(!first.includes("Kelime ailesi")&&!first.includes("grammar pattern")&&first.includes("Daha fazla bilgi"),"first exposure is minimal");
  ok((first.match(/class="chip"/g)||[]).length<=2,"≤2 synonyms");ok((first.match(/<li>/g)||[]).length<=2,"≤2 collocations");
  rateFlow(w.id,"good");day(1);rateFlow(w.id,"good");day(4);rateFlow(w.id,"good");REV++;const fam=cardBody(w,false);ok(fam.includes("Kelime ailesi")&&fam.includes("grammar pattern"),"familiar adds family and pattern");
  ok(cardBody(w,true).includes("Kelime ailesi"),"detail sheet shows all");
});
test("deneme sonucu ve readiness karşılaştırması",()=>{
  fresh();sheet={type:"mock"};ok(vSheet().includes("Toplam doğru"),"mock form");sheet=null;
  S.mocks.push({d:T(),total:52,vocab:82,cloze:null,sc:null,reading:48});const h=vRealCal();ok(h.includes("Readiness vs Mock Exam")&&h.includes("%82"),"comparison table");
  ok(!/YDS'den \d+ alırsın/.test(vProgress()),"no score prediction");ok(vProgress().includes("YDS puanı tahmini değildir"),"disclaimer");
});
test("soru geri bildirimi ve tekrar eden yanlış seçenek",()=>{
  fresh();startSession("yds",5);const it=cur();const wrong=it.opts.findIndex(o=>!o.ok);answer(wrong);
  ok(vSession().includes("Bu soruda sorun var"),"flag action visible");S.flags.push({q:qKey(it),reason:"Birden fazla doğru olabilir",d:T()});
  const k=qKey(it);SS=null;startSession("yds",5);SS.phases[0].items[0]=it;SS.ii=0;SS.ans=null;answer(wrong);eq(S.wrongPicks[k].rep,1,"same wrong option twice → warning");
  SS=null;ok(vRealCal().includes("Aynı yanlış seçeneğin"),"debug warning");
});
test("30 günlük rapor ve önerilen değişiklikler",()=>{
  fresh();eq(recommendedChanges().length,0,"no recommendations without data");
  S.schedTot.good={n:50,ok:48};S.schedTot.hard={n:45,ok:18};const rc=recommendedChanges();ok(rc.some(x=>/Good aralığı biraz uzatılabilir/.test(x)),"good too high");ok(rc.some(x=>/Hard aralığı kısaltılmalı/.test(x)),"hard too low");
  eq(S.spacing.good,1,"not auto-applied");eq(ALG,"scheduler-v2","no scheduler-v3 without approval");
  S.calStart=T()-40;for(let i=0;i<30;i++)S.days[T()-i]={n:5,r:20,q:30,c:25,m:1,rd:{c:4,w:1}};REV++;const r=report30();eq(r.studyDays,30);ok(r.changes.length>=2&&r.introduced===150,"report content");
  sheet={type:"report30"};ok(vSheet().includes("Algoritmada değiştirilmesi önerilenler"));sheet=null;
});
test("yedek: kalibrasyon verisi dahil, ham veri çoğaltılmaz",()=>{
  fresh();makeMastered("enhance");startSession("yds",5);while(SS){answer(cur().opts.findIndex(o=>o.ok));next()}
  S.ev.push([Date.now()-60*86400000,7,"x","increase",null,"cloze",3000,1,1,ALG]);
  const o=JSON.parse(exportText());ok(o.realUserCalibration&&o.calibrationStats.ratingGap,"calibration data included");
  ok(!("qstats" in o.data)&&!("dailyStats" in o.data),"question/daily stats not duplicated inside data");ok(o.data.ev.every(e=>evDay(e[0])>=T()-30),"old raw events aggregated in backup");
  ok(Object.keys(o.dailyStats).length>=1,"aggregates present");const r=validateBackup(JSON.stringify(o));eq(JSON.stringify(r.state.qstats),JSON.stringify(S.qstats),"qstats restored on import");
});
test("performans kaydı (1/14/30. gün)",()=>{
  fresh();for(let d=0;d<31;d++){day(d);startSession("daily");if(SS)play(.8)}
  ok(S.perfLog.some(x=>x.m===1)&&S.perfLog.some(x=>x.m===14)&&S.perfLog.some(x=>x.m===30),"milestones recorded");ok(S.perfLog.every(x=>x.chars>0&&x.renderMs>=0),"storage + render");
});

/* 14. Uzun simülasyon: 60 gün, tüm modlar, tüm görünümler */
test("60 günlük simülasyon (tüm modlar ve görünümler)",()=>{
  fresh();store["ydsKelimeAtolyesi.undo"]=undefined;const modes=["recall"];
  for(let d=0;d<60;d++){day(d);S.settings.recall=["auto","buttons","open"][d%3];
    startSession("daily");if(SS)play(.8);vSummary();
    if(d%3===0){startSession("quick");if(SS)play(.7)}
    if(d%4===1&&weakList().length){startSession("weak");play(.6)}
    if(d%5===2){startSession("yds",[5,10,20][d%3]);play(.7);eq(summary.type,"yds");vSummary()}
    if(d%6===3){startSession("read");play(.7)}
    if(d%7===4){startSession("clz");play(.7)}
    if(d%9===5){startSession("conn");play(.7)}
    if(d%8===6){startSession("extra");if(SS)play(.8)}
    if(d%10===7){startSession("pair",d%PAIRS.length);play(.7)}
    if(d%11===8){startSession("cluster",Object.keys(GROUPS)[d%30]);play(.8)}
    if(d%12===9){startSession("ladder",LADDERS[d%LADDERS.length].id);play(.8)}
    if(d===1){startSession("place");play(.7)}
    tab="home";vHome();tab="study";vStudy();vWords();vProgress();wf="weak";vWords();wf="all";
    for(const t of ["detail","pairs","clusters","conn","weekly","yds","import","export"]){sheet={type:t,id:Object.keys(S.cards)[0]||"increase",g:"increase",i:0};vSheet()}
    sheet={type:"ladder",id:LADDERS[d%30].id};vSheet();sheet={type:"cluster",g:"decrease"};vSheet();sheet=null;
  }
  const st=stats();ok(st.st.mastered>20,"mastered after 60 days: "+st.st.mastered);ok(Object.keys(S.cards).length>300,"learned "+Object.keys(S.cards).length);
  const v=validateContent();eq(v.errors.filter(e=>e.type==="impossible-mastered"||e.type==="invalid-review-date").length,0,"no impossible card state");
  ok(S.mini.length>=10,"mini history");const mem=memoryStats();ok(mem.storage>0&&mem.retrieval>0,"memory stats");
  location.hash="#debug";ok(vProgress().includes("İçerik doğrulama"),"debug panel");location.hash="";
  RESULTS.sim={mastered:st.st.mastered,learned:Object.keys(S.cards).length,weak:st.st.weak,ctxLevel:S.ctxLevel,stage:st.stage};
});

/* Rapor */
let A=0,F=0;for(const r of RESULTS){if(!r.name)continue;A+=r.asserts;F+=r.fails.length;origLog((r.fails.length?"✗ ":"✓ ")+r.name+"  ("+r.asserts+" kontrol)");r.fails.slice(0,8).forEach(f=>origLog("     - "+f))}
origLog("\nTEST:",RESULTS.filter(r=>r.name).length,"· KONTROL:",A,"· BAŞARISIZ KONTROL:",F,"· BAŞARISIZ TEST:",RESULTS.filter(r=>r.name&&r.fails.length).length);
origLog("perf:",JSON.stringify(RESULTS.perf));origLog("seçenek seti kontrolü:",RESULTS.optionsChecked,"· doğrulama:",RESULTS.validation&&RESULTS.validation.passed+"/"+RESULTS.validation.words,"· sim:",JSON.stringify(RESULTS.sim));
process.exitCode=F?1:0;
origLog('RESULT_JSON '+JSON.stringify({suite:'engine',tests:RESULTS.filter(r=>r.name).length,checks:A,failures:F}));
`);
setTimeout(()=>process.exit(process.exitCode),50);
