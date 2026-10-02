/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= MINI YDS ================= */
function ydsPickWord(filter){
  const studied=Object.keys(S.cards).filter(id=>BY[id]&&filter(BY[id]));
  const pool=studied.length>=8?studied:W.filter(w=>filter(w)&&w.l<=2).map(w=>w.id);
  return BY[pool[Math.floor(Math.random()*pool.length)]];
}
const blankHtml=s=>esc(s).replace("___","<span class=\"blank\">----</span>").replace("----","<span class=\"blank\">----</span>");
function ydsAuto(yt){
  if(yt==="vocab"){const w=ydsPickWord(w=>!isLink(w)&&w.czd.length>=4);const s=pickSent(w.id,"yctx")[1]||w.cz;
    const o=[w.w,...w.czd.slice(0,4)];
    return{yt,id:w.id,auto:true,stemText:s.replace("___","----"),stem:`<p class="sent long">${blankHtml(s)}</p>`,opts:shuffle(o.map((t,i)=>({t,ok:i===0,ow:i?(BY[t]?`${t} = ${BY[t].tr}; cümlenin anlamına uymuyor.`:"Cümlenin anlamına uymuyor."):""}))),why:w.note,key:[`${w.w} = ${w.tr}`,...w.col.slice(0,1)],gram:w.pat.slice(0,2).join(" · "),words:[w.id]}}
  if(yt==="ctl"){const w=ydsPickWord(w=>isLink(w)&&w.czd.length>=4&&w.cn);if(!w)return null;
    const o=[w.w,...w.czd.slice(0,4)];
    return{yt:"ct",id:w.id,auto:true,stemText:w.cz.replace("___","----"),stem:`<p class="sent long">${blankHtml(w.cz)}</p>`,opts:shuffle(o.map((t,i)=>({t,ok:i===0,ow:i?(BY[t]&&BY[t].cn?`${t}: ${CONN_FN[BY[t].g]||""}, ${STRUCT_SHORT[BY[t].cn.struct]}.`:"Bağlantı ilişkisine uymuyor."):""}))),why:w.note,key:[`${w.w} = ${w.tr}`],gram:w.cn?`${w.w} ${STRUCT_SHORT[w.cn.struct]} · ${w.cn.punct}`:"",words:[w.id]}}
  return null;
}
function bankItem(b,idx){
  const opts=b.o.map((t,i)=>({t,ok:i===b.a,ow:b.ow[i]||""}));
  let stem;
  if(b.t==="tr")stem=`<p class="sent long">${esc(b.q)}</p><p class="qtext">Yukarıdaki cümlenin en yakın çevirisi hangisidir?</p>`;
  else if(b.t==="rs")stem=`<p class="sent long">${esc(b.q)}</p><p class="qtext">Choose the sentence that is closest in meaning.</p>`;
  else if(b.t==="pc")stem=`<p class="sent long">${blankHtml(b.q)}</p><p class="qtext">Paragrafı en uygun şekilde tamamlayan cümle hangisidir?</p>`;
  else if(b.t==="rd"){const p=PBY[b.p];stem=`<details class="passage" open><summary>${esc(p.title)}</summary><p class="ptext">${esc(p.text)}</p></details><p class="qtext">${esc(b.q)}</p>`}
  else stem=`<p class="sent long">${blankHtml(b.q)}</p>`;
  return{yt:b.t,bank:idx,stemText:b.q,stem,opts:shuffle(opts),why:b.why||"",key:b.key||[],gram:b.gram||"",words:(b.w||[]).filter(id=>BY[id]),pid:b.p};
}
/* Soru tanışıklığı: hiç görülmeyen → en uzun süredir görülmeyen; son 14 günde doğru yapılan soru mümkünse gelmez, yanlış yapılan 3 gün sonra dönebilir. */
function qPriority(qid,t){
  const q=S.qstats[qid];if(!q||!q.n)return Math.random()*.1;
  const age=q.last==null?999:t-q.last;
  if(q.lastOk&&age<14)return 3+1/(1+age);
  if(q.lastOk===false&&age<3)return 2.5+1/(1+age);
  return 1+1/(1+age);
}
function ydsBank(t,used){
  const all=t==="rd"?RD.map((b,i)=>({b,i:"r"+i})):BANK.map((b,i)=>({b,i:"b"+i})).filter(x=>x.b.t===t);
  if(!all.length)return null;
  const day=today();
  const pool=all.filter(x=>!used.has(x.i));const src=pool.length?pool:all;
  const ranked=src.map(x=>({x,p:qPriority(x.i,day)+Math.random()*.01})).sort((a,b)=>a.p-b.p);
  const x=ranked[0].x;used.add(x.i);
  if(t==="rd"){const sib=RD.map((b,i)=>({b,i:"r"+i})).filter(y=>y.b.p===x.b.p&&!used.has(y.i));sib.forEach(y=>used.add(y.i))} // aynı pasajdan tek soru
  return bankItem(x.b,x.i);
}
const YDS_PLANS={5:["vocab","ct","sc","tr","rd"],10:["vocab","vocab","ct","ct","sc","tr","rs","pc","rd","rd"],20:["vocab","vocab","vocab","vocab","ct","ct","ct","sc","sc","sc","tr","tr","rs","rs","pc","pc","rd","rd","rd","rd"],
  40:["vocab","vocab","vocab","vocab","vocab","vocab","vocab","vocab","ct","ct","ct","ct","ct","ct","sc","sc","sc","sc","sc","sc","tr","tr","tr","tr","rs","rs","rs","rs","pc","pc","pc","pc","rd","rd","rd","rd","rd","rd","rd","rd"]};
function ydsSet(n){
  const plan=YDS_PLANS[n]||YDS_PLANS[10];
  const used=new Set();let vAlt=0,ctAlt=0;
  const items=plan.map(t=>{let q=null;
    if(t==="vocab"){q=(vAlt++%2===1)?ydsAuto("vocab"):ydsBank("vocab",used);if(!q)q=ydsAuto("vocab")}
    else if(t==="ct"){q=(ctAlt++%3===2)?ydsAuto("ctl"):null;if(!q)q=ydsBank("ct",used)}
    else q=ydsBank(t,used);
    return q&&Object.assign({k:"yds"},q)}).filter(Boolean);
  // Okuma soruları aynı pasajdan geliyorsa art arda gelsin
  const rd=items.filter(x=>x.yt==="rd").sort((a,b)=>String(a.pid).localeCompare(String(b.pid)));
  return[...items.filter(x=>x.yt!=="rd"),...rd];
}
function ydsBalance(items){const c=[0,0,0,0,0];items.forEach(it=>{const i=it.opts.findIndex(o=>o.ok);if(i>=0)c[i]++});return c}

