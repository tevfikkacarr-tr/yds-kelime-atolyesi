/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= İÇERİK DOĞRULAMA (gizli hata ayıklama) ================= */
function validateContent(){
  const E=[],WARN=[];const add=(type,id,msg)=>E.push({type,id,msg});
  const ids=new Set(),words=new Set();
  for(const w of W){
    if(ids.has(w.id))add("duplicate-id",w.id,"");ids.add(w.id);
    const lw=w.w.toLowerCase();if(words.has(lw))add("duplicate-word",w.id,"");words.add(lw);
    if(!w.tr||!w.tr.trim())add("missing-meaning",w.id,"");
    if(!/\*[^*]+\*/.test(w.ex))add("empty-example",w.id,w.ex);
    if(!w.exTr)add("missing-translation",w.id,"");
    if(!GROUPS[w.g])add("invalid-group",w.id,w.g);
    if(!w.col.length)add("missing-collocations",w.id,"");
    if(!w.syn.length&&!isLink(w))add("invalid-synonyms",w.id,"eş anlam yok");
    if(w.syn.includes(w.w)||new Set(w.syn).size!==w.syn.length||w.syn.some(s=>!s.trim()))add("invalid-synonyms",w.id,w.syn.join(","));
    for(const x of w.cw)if(!BY[x])add("broken-confusedWith",w.id,x);
    if(!w.cz||w.cz.split("___").length!==2)add("bad-cloze",w.id,w.cz);
    if(w.x2&&w.x2.split("___").length!==2)add("bad-x2",w.id,w.x2);
    if(w.czd.includes(w.w)||new Set(w.czd).size!==w.czd.length)add("answer-duplication",w.id,w.czd.join(","));
    if(w.czd.some(d=>w.syn.includes(d)))WARN.push({type:"curated-near-synonym",id:w.id,msg:w.czd.filter(d=>w.syn.includes(d)).join(",")});
    if(w.gd.includes(w.en)||(w.en&&w.syn.length&&w.gd.some(d=>w.syn.includes(d))))add("answer-duplication",w.id,"gd");
    if(!(w.l>=1&&w.l<=5))add("invalid-level",w.id,w.l);
    if(!(w.p>=0&&w.p<=100))add("invalid-priority",w.id,w.p);
    for(const k of ["mean","syn","cloze","guess","yctx","coll","fam","cstruct","cfunc","cid"]){
      if(!available(k,w))continue;const it={k,id:w.id};const o=buildOpts(it);
      const need=k==="fam"?Math.min(4,famForms(w).length+1):k==="yctx"?5:4;
      if(new Set(o.map(x=>x.t)).size<need)add("fewer-than-4-choices",w.id,k+":"+o.length);
      if(o.filter(x=>x.ok).length!==1)add("correct-count",w.id,k);
    }
  }
  const t=today();
  for(const id in S.cards){const c=S.cards[id];
    if(!BY[id])continue;
    if(c.masteredOn!=null&&(c.reps===0||!c.cdays.length))add("impossible-mastered",id,"");
    if(!isFinite(c.due)||c.due>t+400||c.due<c.first-1)add("invalid-review-date",id,c.due);
  }
  // Anlam merdivenleri
  const lu={};LADDERS.forEach(L=>{if(L.steps.length<3||L.steps.length>7)add("ladder-steps",L.id,L.steps.length);L.steps.forEach(st=>{if(!st.note)add("ladder-note",L.id,st.w.join("/"));st.w.forEach(x=>{if(!BY[x])add("ladder-word",L.id,x);lu[x]=(lu[x]||0)+1})})});
  for(const x in lu)if(lu[x]>2)add("ladder-reuse",x,lu[x]);
  for(const w of W)(w.cx||[]).forEach(sn=>{if(sn.split("___").length!==2)add("bad-cx",w.id,sn)});
  PASSAGES.forEach(p=>{const n=p.text.split(/\s+/).length;if(n<75||n>150)add("passage-length",p.id,n);if(!READ_LEVELS.includes(p.difficulty))add("passage-difficulty",p.id,p.difficulty);if(p.questionIds.length!==3)add("passage-questions",p.id,p.questionIds.length)});
  CLOZES.forEach(c=>c.blanks.forEach((b,i)=>{if(!["vocab","connector","preposition","grammar","collocation"].includes(b.type))add("cloze-type",c.id,i)}));
  const chk=(b,src)=>{if(b.o.length!==5||new Set(b.o).size!==5||!(b.a>=0&&b.a<5))add("bank-item",src,b.q.slice(0,40))};
  BANK.forEach((b,i)=>chk(b,"bank"+i));RD.forEach((b,i)=>{chk(b,"rd"+i);if(!PBY[b.p])add("reading-passage",i,b.p)});
  CLOZES.forEach(c=>c.blanks.forEach((b,i)=>{if(new Set(b.o).size!==5)add("cloze-options",c.id,i)}));
  TRAPS.forEach((tr,i)=>{if(tr.s.split("___").length!==2||new Set(tr.o).size!==tr.o.length)add("trap",i,tr.s)});
  const byType={};E.forEach(e=>byType[e.type]=(byType[e.type]||0)+1);
  return{words:W.length,errors:E,warnings:WARN,byType,passed:W.length-new Set(E.filter(e=>BY[e.id]).map(e=>e.id)).size,bank:BANK.length+RD.length};
}
if(typeof window!=="undefined")window.ydsValidate=()=>{const r=validateContent();try{console.log(`[YDS] ${r.passed}/${r.words} kelime doğrulamayı geçti, ${r.errors.length} sorun.`);if(r.errors.length)console.table(r.errors)}catch(e){}return r};

/* Haftalık rapor her 7 günde bir hazırlanır: son görülmeden 7+ gün geçtiyse ve en az 3 çalışma günü varsa */
function weeklyDue(){const t=today();if(S.weeklySeen!=null&&t-S.weeklySeen<7)return false;return weekStats(t).days>=3}

