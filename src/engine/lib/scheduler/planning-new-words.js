/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= YENİ KELİME SEÇİMİ (ydsPriorityScore) ================= */
function pickNew(n,opts){
  if(n<=0)return[];
  opts=opts||{};const out=[];
  for(const id of S.queue){if(out.length>=n)break;if(BY[id]&&!S.cards[id])out.push(id)}
  // Yerleştirme testinde zaten bildiğin kelimeler biraz geriye alınır
  const known=new Set(S.placeKnown||[]),ep=w=>w.p-(known.has(w.id)?15:0);
  const unseen=W.filter(w=>!S.cards[w.id]&&!out.includes(w.id)).sort((a,b)=>ep(b)-ep(a));
  const win=unseen.slice(0,Math.max((n-out.length)*3,30));
  const byG={};win.forEach(w=>(byG[w.g]=byG[w.g]||[]).push(w));
  const f=focusGroup();
  let gs=Object.keys(byG).sort((a,b)=>ep(byG[b][0])-ep(byG[a][0]));
  if(f&&byG[f.g])gs=[f.g,...gs.filter(g=>g!==f.g)];
  let links=out.filter(id=>isLink(BY[id])).length;const maxLinks=opts.maxLinks??3;
  // Anlamsal girişim kontrolü: aynı anlam merdiveninden en fazla 3, aynı kümeden en fazla 3 yeni kelime
  const ladCnt={},grpCnt={};out.forEach(id=>{grpCnt[BY[id].g]=(grpCnt[BY[id].g]||0)+1;(LADBY[id]||[]).forEach(L=>ladCnt[L.id]=(ladCnt[L.id]||0)+1)});
  const fits=w=>(grpCnt[w.g]||0)<3&&(LADBY[w.id]||[]).every(L=>(ladCnt[L.id]||0)<3);
  const take=w=>{out.push(w.id);grpCnt[w.g]=(grpCnt[w.g]||0)+1;(LADBY[w.id]||[]).forEach(L=>ladCnt[L.id]=(ladCnt[L.id]||0)+1)};
  for(const g of gs)for(const w of byG[g].slice(0,3)){if(out.length>=n)break;if(!fits(w))continue;if(isLink(w)){if(links>=maxLinks)continue;links++}take(w)}
  for(const w of unseen){if(out.length>=n)break;if(out.includes(w.id)||!fits(w))continue;if(isLink(w)){if(links>=maxLinks)continue;links++}take(w)}
  return out;
}
function adaptRatios(){
  const r=Object.assign({},RATIOS),why=[];
  const a=k=>{const x=S.err[k];return x.c+x.w>=8?x.c/(x.c+x.w):null};
  const sa=a("syn"),ca=a("ctx"),fa=a("conf");
  if(sa!=null&&sa<.7){r.syn+=.05;r.due-=.05;why.push("eş anlam")}
  if(ca!=null&&ca<.7){r.ctx+=.05;r.new-=.05;why.push("bağlam")}
  if((fa!=null&&fa<.7)||Object.keys(S.conf).length>=3){r.conf+=.05;r.weak-=.05;why.push("karıştırılan kelimeler")}
  return{r,why};
}
function spreadOverflow(ids,perDay){const t=today(),out={};ids.forEach((id,i)=>{out[id]=t+1+Math.floor(i/Math.max(5,perDay))});return out}
function plan(mode){return memo("plan:"+mode+":"+S.settings.length+":"+S.settings.newPerDay+":"+S.noNewDay+":"+S.doneDay,()=>planRaw(mode))}
function planRaw(mode){
  const t=today(),cfg=LEN[S.settings.length]||LEN.normal,U=cfg.cap;
  const {r:R,why}=adaptRatios();
  const ret=id=>retr(S.cards[id],t);
  const rp={};const prob=id=>rp[id]??(rp[id]=recallProbability(id,t));
  // Karar motoru: önce en yüksek öğrenme değeri (gecikmiş + düşük hatırlama olasılığı, aktarım açığı, zayıflık, YDS önceliği)
  const val={};const lv=id=>val[id]??(val[id]=learningValueScore(id,t,prob(id)));
  const dueAll=dueList().sort((a,b)=>(lv(b)-lv(a))||(prob(a)-prob(b)));
  const weakAll=weakList();
  let n=Math.round(S.settings.newPerDay*cfg.nm),note=null;
  if(S.firstNew&&!Object.keys(S.cards).length)n=Math.min(n,S.firstNew);   // karşılama: yalnızca ilk oturumun yükü
  if(dueAll.length>100){n=Math.min(n,5);note=`Tekrar bekleyen ${dueAll.length} kelime var; bugün yeni kelime sayısı ${n}'e düşürüldü.`}
  else if(dueAll.length>60){n=Math.min(n,10);note=`Tekrar bekleyen ${dueAll.length} kelime var; bugün yeni kelime sayısı ${n}'a düşürüldü.`}
  if(S.noNewDay===t&&mode==="daily"){n=0;note="Bugün yalnızca tekrar yapıyorsun."}
  if(mode==="daily"&&S.doneDay===t)n=0;
  if(mode==="extra")n=5;
  const revUnits=U*(1-R.new),share=k=>revUnits*R[k]/(1-R.new);
  const weak=weakAll.slice(0,Math.max(mode==="extra"?8:0,Math.floor(share("weak")/UNIT.weak)));
  const synN=Math.round(share("syn")/UNIT.q),ctxN=Math.round(share("ctx")/UNIT.q),confN=Math.max(0,Math.round(share("conf")/UNIT.conf));
  let dueUnits=revUnits-weak.length*UNIT.weak-synN-ctxN-confN*UNIT.conf;
  const dueRest=dueAll.filter(id=>!weak.includes(id));
  const maxRev=mode==="extra"?0:Math.max(0,Math.floor(dueUnits/UNIT.flash));
  const review=dueRest.slice(0,maxRev);
  const overflow=dueRest.slice(review.length);
  let early=[];
  if(mode!=="extra"&&review.length<maxRev){
    early=Object.keys(S.cards).filter(id=>BY[id]&&S.cards[id].due>t&&S.cards[id].due<=t+3&&!weak.includes(id)&&ret(id)<.6).sort((a,b)=>ret(a)-ret(b)).slice(0,Math.min(10,maxRev-review.length));
  }
  // Gecikmeli aktarım kontrolleri: 3–7 gün önce öğrenilen, bugün tekrarı olmayan kelimeler (yeni kelimelerden önce)
  const dtc=mode==="extra"?[]:Object.keys(S.cards).filter(id=>{const c=S.cards[id];return BY[id]&&c.first<=t-3&&c.first>=t-7&&c.due>t&&!weak.includes(id)&&!(c.restUntil>t)&&c.trD==null}).sort((a,b)=>lv(b)-lv(a)).slice(0,3);
  const used=review.length*UNIT.flash+early.length*UNIT.flash+weak.length*UNIT.weak+synN+ctxN+confN*UNIT.conf+dtc.length*UNIT.q;
  const newCap=Math.max(mode==="extra"?5:0,Math.floor((U-used)/UNIT.new));
  const newIds=pickNew(Math.min(n,newCap));
  if(newIds.length<n&&!note&&n>0&&newCap<n)note=`Bugünkü kapasite dolu olduğu için yeni kelime sayısı ${newIds.length} ile sınırlandı.`;
  const demand=(dueAll.length*UNIT.flash+Math.min(weakAll.length,12)*UNIT.weak+n*UNIT.new)/U;
  const loadScore=(used+newIds.length*UNIT.new)/U;
  const load=demand<.4?"light":demand<=1?"normal":"heavy";
  const secs=newIds.length*95+(review.length+early.length)*14+weak.length*45+(synN+ctxN)*18+confN*35+cfg.mini*22;
  return{newIds,review,early,weak,dueAll,overflow,synN,ctxN,confN,dtc,minutes:Math.max(1,Math.round(secs/60)),note,cfg,ratios:R,why,load,demand,loadScore,cap:U};
}
const LOAD={light:"Hafif",normal:"Normal",heavy:"Yoğun"};

