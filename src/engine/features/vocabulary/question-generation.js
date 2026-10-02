/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= SORU ÜRETİMİ ================= */
function available(k,w,n){
  n=n||4;
  if(k==="mean")return true;
  if(k==="syn")return w.syn.length>0&&w.gd.length>=n-1;
  if(k==="pairq"&&w.id==="ensure")return false;   // ensure/insure: bölgesel kullanım farkı nedeniyle soru üretilmez
  if(k==="cloze"||k==="pairq")return w.czd.length>=n-1;
  if(k==="yctx")return!!(w.x2||(w.cx&&w.cx.length))&&w.czd.length>=4;
  if(k==="cpunct")return CPUNCT_OK.has(w.id);
  if(k==="place")return!isLink(w);
  if(k==="guess")return!!w.en&&w.gd.length>=n-1;
  if(k==="coll")return w.col.length>0&&w.bad.length>=n-1;
  if(k==="fam")return famForms(w).length>=2;
  if(k==="cstruct")return isLink(w)&&!!w.cn&&!CONN_SKIP.has(w.id);
  if(k==="cfunc"||k==="cid")return isLink(w)&&!!w.cn&&!CONN_SKIP.has(w.id);
  return true;
}
const SENT={cloze:"cz",fam:"cz",pairq:"cz",yctx:"x2",guess:"ex"};
/* Cümle havuzu: aynı kelime için cz + x2 + cx[] cümleleri; aynı cümle kısa sürede tekrar gösterilmez. */
function blankSents(w,kind){const all=[["cz",w.cz]];if(w.x2)all.push(["x2",w.x2]);(w.cx||[]).forEach((s,i)=>all.push(["cx"+i,s]));
  if(kind==="yctx"){const long=all.filter(([k,s])=>k!=="cz"&&s.split(" ").length>=16);return long.length?long:all.filter(([k])=>k!=="cz")}
  return all}
function pickSent(id,kind){
  const w=BY[id],c=S.cards[id],ex=(c&&c.exp)||{};
  const list=shuffle(blankSents(w,kind));if(!list.length)return["cz",w.cz];
  list.sort((a,b)=>(ex[a[0]]??-1e9)-(ex[b[0]]??-1e9));
  return list[0];
}
function recentlySeen(id,key,days){const c=S.cards[id];if(!c||!c.exp||c.exp[key]==null)return false;return today()-c.exp[key]<(days||2)}
function kindFresh(id,k){if(k==="guess")return!recentlySeen(id,"ex");if(k==="cloze"||k==="yctx")return blankSents(BY[id],k).some(([key])=>!recentlySeen(id,key));return true}
function markSeen(id,k,it){const key=(it&&it.sk)||SENT[k];const c=S.cards[id];if(key&&c){c.exp=c.exp||{};c.exp[key]=today()}}
/* Bağlam zorluğu: Kolay (işaretli örnek cümleden tahmin) → Orta (boşluk doldurma) → YDS (uzun akademik cümle, 5 seçenek) */
function ctxPick(id,level){
  const w=BY[id];level=level||S.ctxLevel;
  const pref=level>=3?["yctx","cloze","guess"]:level===2?["cloze","yctx","guess"]:["guess","cloze","yctx"];
  const av=pref.filter(k=>available(k,w));
  if(!av.length)return null;
  const fresh=av.filter(k=>kindFresh(id,k));
  return(fresh[0]||av[0]);
}
function meanCands(w){
  const k=clsOf(w);
  let c=W.filter(x=>x.id!==w.id&&x.g!==w.g&&clsOf(x)===k&&!w.syn.includes(x.w)&&!x.syn.includes(w.w)&&!trOverlap(w,x));
  c=shuffle(c);
  if(c.length<4){const more=shuffle(W.filter(x=>x.id!==w.id&&x.g!==w.g&&!isLink(x)&&!c.includes(x)&&!w.syn.includes(x.w)&&!x.syn.includes(w.w)&&!trOverlap(w,x)));c=c.concat(more)}
  const cw=w.cw.find(x=>BY[x]&&!trOverlap(w,BY[x])&&!w.syn.includes(x));
  if(cw){c=c.filter(x=>x.id!==cw);c.unshift(BY[cw])}
  return c;
}
/* Bağlaç noktalama/konum sorusu: aynı iki cümlenin dört farklı noktalaması, yalnızca biri doğru. */
const CP_PAIRS={lcontrast:["the new drug was highly effective","it caused serious side effects in some patients"],lresult:["the factory closed down last year","hundreds of local workers lost their jobs"],
  ladd:["cycling reduces traffic in city centres","it improves the physical health of commuters"],lexample:["some birds cannot fly at all","penguins use their wings to swim instead"],lcond:["patients must complete the full course of treatment","the infection may return"]};
const CPUNCT_OK=new Set(["however","nevertheless","nonetheless","on the other hand","therefore","thus","consequently","as a result","moreover","furthermore","in addition","for instance","otherwise","although","even though"].filter(x=>BY[x]));
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
function cpunctOpts(w){
  const [A,B]=CP_PAIRS[w.g],x=w.w;
  if(w.cn.struct==="clause")return[`${cap(x)} ${A}, ${B}.`,`${cap(x)}, ${A}, ${B}.`,`${cap(x)} ${A}. ${cap(B)}.`,`${cap(A)}, ${x}, ${B}.`];
  return[`${cap(A)}; ${x}, ${B}.`,`${cap(A)}, ${x} ${B}.`,`${cap(A)} ${x}, ${B}.`,`${cap(A)}, ${x}, ${B}.`];
}
const CM_KIND={mean:"meaning",reverse:"meaning",cfunc:"function",cstruct:"structure",cpunct:"punct",cid:"select",cloze:"select",yctx:"select",pairq:"select",trap:"select"};
const CM_LABEL={meaning:"Anlam",function:"İşlev (zıtlık/sonuç/sebep)",structure:"Yapı",punct:"Konum ve noktalama",select:"Cümlede seçim"};
function connMastery(id){const c=S.cards[id];const o={};for(const k in CM_LABEL){const x=c&&c.cm&&c.cm[k];o[k]=x&&x.c+x.w?Math.round(100*(x.c+.5)/(x.c+x.w+1)):null}return o}
/* Eş anlam bilgi grafiği: doğru cevap olarak güçlü/yakın eş anlam tercih edilir; “farklı dil bilgisi” veya “bağlama bağlı” olanlar kaçınılır. */
function pickSyn(w){
  const ok=w.syn.filter(x=>{const r=BY[x]?relOf(w.id,x):null;return!r||r[0]==="strong"||r[0]==="near"||r[0]==="intensity"});
  return ok[0]||w.syn[0];
}
function connPool(w){return W.filter(x=>isLink(x)&&x.cn&&x.id!==w.id&&!CONN_SKIP.has(x.id))}
function rawOpts(it,n){
  const w=BY[it.id];let correct,pool,syn=[];
  if(it.k==="syn"){correct=pickSyn(w);pool=shuffle(w.gd);syn=w.syn}
  else if(it.k==="guess"){correct=w.en;pool=shuffle(w.gd)}
  else if(it.k==="coll"){correct=w.col[Math.floor(Math.random()*w.col.length)];pool=shuffle(w.bad)}
  else if(it.k==="fam"){correct=w.w;pool=famForms(w)}
  else if(it.k==="pairq"){correct=w.w;pool=[...it.p.ws.filter(x=>x!==w.w),...shuffle(w.czd)]}
  else if(it.k==="cloze"){correct=w.w;pool=shuffle(w.czd);if(!it.sent){const[k,sn]=pickSent(it.id,"cloze");it.sk=k;it.sent=sn}}
  else if(it.k==="yctx"){correct=w.w;pool=shuffle(w.czd);n=5;if(!it.sent){const[k,sn]=pickSent(it.id,"yctx");it.sk=k;it.sent=sn}}
  else if(it.k==="cpunct"){const o=cpunctOpts(w);correct=o[0];pool=o.slice(1)}
  else if(it.k==="place"){correct=w.tr.split(" / ")[0];pool=meanCands(w).map(x=>x.tr.split(" / ")[0])}
  else if(it.k==="cstruct"){correct=STRUCT[w.cn.struct];pool=shuffle(Object.keys(STRUCT).filter(s=>s!==w.cn.struct).map(s=>STRUCT[s]))}
  else if(it.k==="cfunc"){correct=CONN_FN[w.g];pool=shuffle(Object.keys(CONN_FN).filter(g=>g!==w.g&&!(w.g==="lcause"&&g==="lresult")&&!(w.g==="lresult"&&g==="lcause")).map(g=>CONN_FN[g]))}
  else if(it.k==="cid"){correct=w.w;const P=connPool(w);
    const sameG=shuffle(P.filter(x=>x.g===w.g&&x.cn.struct!==w.cn.struct)).slice(0,2);
    const sameS=shuffle(P.filter(x=>x.g!==w.g&&x.cn.struct===w.cn.struct));
    const other=shuffle(P.filter(x=>x.g!==w.g&&x.cn.struct!==w.cn.struct));
    pool=[...sameG,...sameS,...other].map(x=>x.w)}
  else{correct=w.w;pool=meanCands(w).map(x=>x.w)}
  const seen=new Set([correct,...syn]),d=[];
  for(const o of pool){if(d.length>=n-1)break;if(!seen.has(o)){seen.add(o);d.push(o)}}
  const wid=t=>BY[t]?t:null;
  return shuffle([{t:correct,ok:true,wid:wid(correct)},...d.map(t=>({t,ok:false,wid:wid(t)}))]);
}
/* Çeldirici kalitesi: 0–1. 0.6 altı sorular gösterilmez. */
function distractorQuality(it,opts){
  const w=BY[it.id];let q=1;const need=it.k==="fam"?Math.min(4,famForms(w).length+1):it.k==="yctx"?5:4;
  if(opts.length<need)q-=.5;
  if(opts.length<3)q-=.5;
  if(new Set(opts.map(o=>o.t.toLowerCase())).size!==opts.length)q-=1;
  if(opts.filter(o=>o.ok).length!==1)q-=1;
  const wrong=opts.filter(o=>!o.ok);
  for(const o of wrong){
    const x=o.wid&&BY[o.wid];
    if(["mean","cloze","yctx","pairq"].includes(it.k)){
      const curated=it.k!=="mean"&&w.czd.includes(o.t);               // elle yazılmış kalıp çeldiricisi (ör. held prone ✗)
      if(!curated&&(w.syn.includes(o.t)||(x&&x.syn.includes(w.w))))q-=.5; // ikinci doğru cevap riski
      else if(!curated&&x&&sameLadder(w.id,x.id))q-=.5;                 // aynı anlam ailesi: ikisi de cümleye oturabilir
      if(it.k==="mean"&&x&&trOverlap(w,x))q-=.4;
      if(it.k==="mean"&&x&&clsOf(x)!==clsOf(w)&&!isLink(w))q-=.08;     // sözcük türü uyumsuzluğu ipucu verir
    }
    if(it.k==="syn"&&(w.syn.includes(o.t)||o.t===w.w))q-=.6;
    if(it.k==="syn"&&x&&sameLadder(w.id,x.id))q-=.5;
    if(x&&x.id!==w.id){const rl=relOf(w.id,x.id);if(rl&&(rl[0]==="strong"||rl[0]==="near")&&!(it.k!=="mean"&&w.czd.includes(o.t)))q-=.5}
  }
  if(["coll","guess","syn"].includes(it.k)&&wrong.length){
    const avg=wrong.reduce((a,o)=>a+o.t.length,0)/wrong.length,cl=opts.find(o=>o.ok);
    if(cl&&cl.t.length>avg*2.2&&cl.t.length-avg>8)q-=.15;           // çok uzun doğru cevap ipucu
  }
  return Math.max(0,Math.round(q*100)/100);
}
function buildOpts(it,n){
  let best=null,bq=-1;
  for(let i=0;i<3;i++){const o=rawOpts(it,n||4),q=distractorQuality(it,o);if(q>bq){best=o;bq=q}if(q>=1)break}
  it.dq=bq;return best;
}
function globalAcc(s){const x=S.err[s];return(x.c+1)/(x.c+x.w+2)}
function kindsFor(id,only){
  const w=BY[id],c=S.cards[id];
  const sa=s=>{const x=c&&c.sk[s];return x?(x.c+1)/(x.c+x.w+2):.5};
  const ck=ctxPick(id);
  const opts=[["mean","mean"],["syn","syn"],["ctx",ck],["coll","coll"],["fam","fam"]].filter(([s,k])=>k&&available(k,w)&&(!only||only.includes(k)||(s==="ctx"&&only.includes("ctx"))));
  if(isLink(w)&&available("cstruct",w)&&(!only||only.includes("ctx")))opts.push(["ctx","cstruct"]);
  if(isLink(w)&&available("cpunct",w)&&(!only||only.includes("ctx")))opts.push(["ctx","cpunct"]);
  if(c&&wordTags(id).has("RecallGap"))return[...opts.filter(([s])=>s==="mean").map(([s,k])=>k),...opts.filter(([s])=>s!=="mean").map(([s,k])=>k)];
  if(c&&(c.relearn||transferGap(id)))return[...opts.filter(([s])=>s==="ctx").map(([s,k])=>k),...opts.filter(([s])=>s!=="ctx").map(([s,k])=>k)];   // unutulan kalıcı: önce bağlam
  return opts.map(([s,k])=>({k,v:sa(s)*.7+globalAcc(s)*.3+Math.random()*.06})).sort((a,b)=>a.v-b.v).map(x=>x.k);
}
function drill(id){const w=BY[id];return["mean","syn",ctxPick(id),"coll","fam"].filter(k=>k&&available(k,w)).map(k=>({k,id,drill:true}))}
const MEAN_STEMS=[t=>`Which word means <q>${t}</q>?`,t=>`<q>${t}</q> anlamına gelen kelime hangisi?`,t=>`Choose the English word for <q>${t}</q>.`];

