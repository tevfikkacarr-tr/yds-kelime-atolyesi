/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= HAFTALIK RAPOR VE İÇGÖRÜLER ================= */
function weekStats(end){
  end=end??today();const o={n:0,r:0,q:0,c:0,m:0,days:0,sk:{},g:{},rd:{c:0,w:0}};
  for(let d=end-6;d<=end;d++){const x=S.days[d];if(!x)continue;o.days++;o.n+=x.n||0;o.r+=x.r||0;o.q+=x.q||0;o.c+=x.c||0;o.m+=x.m||0;
    for(const k in x.sk||{}){o.sk[k]=o.sk[k]||{c:0,w:0};o.sk[k].c+=x.sk[k].c;o.sk[k].w+=x.sk[k].w}
    for(const k in x.g||{}){o.g[k]=o.g[k]||{c:0,w:0};o.g[k].c+=x.g[k].c;o.g[k].w+=x.g[k].w}
    if(x.rd){o.rd.c+=x.rd.c;o.rd.w+=x.rd.w}}
  return o;
}
function weeklyReport(){
  const t=today(),a=weekStats(t),b=weekStats(t-7);
  const grp=Object.entries(a.g).filter(([g,x])=>GROUPS[g]&&x.c+x.w>=4).map(([g,x])=>({g,a:x.c/(x.c+x.w),n:x.c+x.w})).sort((x,y)=>y.a-x.a||y.n-x.n);
  const sk=Object.entries(a.sk).filter(([k,x])=>SKILLS[k]&&x.c+x.w>=4).map(([k,x])=>({k,a:x.c/(x.c+x.w)}));
  const imp=sk.map(s=>{const p=b.sk[s.k];return p&&p.c+p.w>=4?{k:s.k,d:s.a-p.c/(p.c+p.w)}:null}).filter(Boolean).sort((x,y)=>y.d-x.d);
  const worst=sk.slice().sort((x,y)=>x.a-y.a)[0]||null;
  const weakG=grp.length>1&&grp[grp.length-1].a<.8?grp[grp.length-1]:null;
  // Gelecek haftanın odak kelimeleri: en zayıf kümedeki (yoksa genel) en düşük ustalıklı / en çok unutulmaya yakın 5 kelime
  const pool=Object.keys(S.cards).filter(id=>BY[id]&&(!weakG||BY[id].g===weakG.g));
  const focusWords=(pool.length>=3?pool:Object.keys(S.cards).filter(id=>BY[id])).sort((x,y)=>(masteryScore(x)+100*retr(S.cards[x],t+7))-(masteryScore(y)+100*retr(S.cards[y],t+7))).slice(0,5);
  const f=focusGroup(),dueNext=Object.values(S.cards).filter(c=>c.due<=t+7).length;
  let focus;
  if(worst&&worst.a<.75)focus=`${SKILLS[worst.k]} soruları (bu hafta %${pct(worst.a)}).`;
  else if(f)focus=`${GROUPS[f.g][0]} grubu (hata oranı %${pct(f.err)}).`;
  else if(dueNext>40)focus=`Tekrarlar: önümüzdeki 7 günde ${dueNext} kelimenin tekrarı var; yeni kelimeyi biraz azaltmak iyi olabilir.`;
  else focus="Yeni kelime ve okuma köprüsü: düzenli tempo iyi gidiyor.";
  return{a,b,acc:a.q?a.c/a.q:null,accPrev:b.q?b.c/b.q:null,strongest:grp[0]||null,improved:imp[0]&&imp[0].d>0?imp[0]:null,needs:worst,focus,weakG,focusWords,mastered:Object.keys(S.cards).filter(id=>statusMap()[id]==="mastered").length};
}
/* Küme ustalığı: kümedeki kelimelerin ustalık puanı, temel kelimeler daha ağır (L1 ×1.5 … L5 ×0.6); görülmemiş kelime 0 sayılır. */
const LV_W={1:1.5,2:1.3,3:1,4:.8,5:.6};
function clusterMastery(ids){
  let s=0,wsum=0,seen=0;for(const id of ids){const w=BY[id];if(!w)continue;const k=LV_W[w.l]||1;wsum+=k;if(S.cards[id]){seen++;s+=k*masteryScore(id)}}
  return{score:wsum?Math.round(s/wsum):0,seen,n:ids.length};
}
function groupMastery(g){return clusterMastery(W.filter(w=>w.g===g).map(w=>w.id))}
function ladderWords(L){return L.steps.flatMap(st=>st.w)}
/* Son 30 gün */
function monthStats(){
  const t=today(),o={days:0,n:0,m:0,fm:0,q:0,c:0,sk:{},rd:{c:0,w:0}};
  for(let d=t-29;d<=t;d++){const x=S.days[d];if(!x)continue;if(x.q||x.n||x.r)o.days++;o.n+=x.n||0;o.m+=x.m||0;o.fm+=x.fm||0;o.q+=x.q||0;o.c+=x.c||0;
    for(const k in x.sk||{}){o.sk[k]=o.sk[k]||{c:0,w:0};o.sk[k].c+=x.sk[k].c;o.sk[k].w+=x.sk[k].w}
    if(x.rd){o.rd.c+=x.rd.c;o.rd.w+=x.rd.w}}
  const dist={new:0,learning:0,familiar:0,weak:0,mastered:0};const sm=statusMap();W.forEach(w=>dist[sm[w.id]]++);
  return Object.assign(o,{acc:o.q?o.c/o.q:null,ctx:accOf(o.sk.ctx),syn:accOf(o.sk.syn),read:accOf(o.rd),dist});
}
/* “Bu hafta ne çalışmalısın?”: en fazla 3 alan + 5 kelime */
function weeklyPlan(r){
  const pr=[];
  if(r.weakG)pr.push(`${GROUPS[r.weakG.g][1]} kümesi (%${pct(r.weakG.a)})`);
  const cd=Object.entries(S.connDim).filter(([k,x])=>x.c+x.w>=6).map(([k,x])=>({k,a:x.c/(x.c+x.w)})).sort((a,b)=>a.a-b.a)[0];
  if(cd&&cd.a<.75)pr.push(`Bağlaç: ${CM_LABEL[cd.k].toLocaleLowerCase("tr-TR")} (%${pct(cd.a)})`);
  if(r.needs&&r.needs.a<.8)pr.push(`${SKILLS[r.needs.k]} soruları (%${pct(r.needs.a)})`);
  const rd=weekStats(today()).rd;if(pr.length<3&&rd&&rd.c+rd.w>=6&&rd.c/(rd.c+rd.w)<.7)pr.push(`Okuma soruları (%${pct(rd.c/(rd.c+rd.w))})`);
  if(!pr.length)pr.push("Düzenli tekrar: tempo iyi, aynı şekilde devam");
  return{areas:pr.slice(0,3),words:r.focusWords.slice(0,5)};
}
function memoryStats(){
  return memo("mem",()=>{const ids=Object.keys(S.cards).filter(id=>BY[id]);if(!ids.length)return null;const t=today();let ms=0,st=0,rt=0;
    for(const id of ids){ms+=masteryScore(id,t);st+=storageStr(S.cards[id]);rt+=retr(S.cards[id],t)}
    return{n:ids.length,mastery:ms/ids.length,storage:st/ids.length,retrieval:rt/ids.length,low:ids.filter(id=>retr(S.cards[id],t)<.5).length}});
}
function insights(){
  const ins=[];const f=focusGroup(),ws=weakestSkill(),lr=lapseRate(),sa=selfAccuracy(),kc=S.self.knowCtx,mem=memoryStats();
  if(f)ins.push({w:1,t:`<b>${esc(GROUPS[f.g][1])}</b> grubunda hata oranın %${pct(f.err)}. Yeni kelimeler ve tekrarlar bu gruba ağırlık veriyor.`});
  if(ws)ins.push({w:1,t:`${SKILL_EN[ws.k]} (${SKILLS[ws.k]}) sorularında başarın %${pct(ws.a)}. Günlük oturumda bu soru tipinin payı artırıldı.`});
  if(sa!=null){
    if(sa<.7)ins.push({w:0,t:`“Biliyorum” dediğin kelimelerin %${pct(sa)}'ini sonraki soruda da doğru cevapladın. Bu çok normal: emin olmadığında “Emin değilim” seçmek, tekrar zamanını sana daha uygun hale getirir.`});
    else ins.push({w:0,t:`Kendini değerlendirmen isabetli: “Biliyorum” dediğin kelimelerin %${pct(sa)}'ini sonraki soruda da doğru cevapladın.`});
  }
  if(kc.n>=4){const miss=1-kc.ok/kc.n;ins.push({w:0,t:miss>=.1?`Bildiğini düşündüğün kelimelerin %${pct(miss)}'inde bağlam sorularında zorlanıyorsun. Anlamı bilmek ile cümlede tanımak farklı beceriler; bu kelimeler bağlam sorularında biraz daha sık gelecek.`:`“Biliyorum” dediğin kelimeleri cümle içinde de tanıyorsun (%${pct(kc.ok/kc.n)}).`})}
  if(S.hardFollow.n>=4)ins.push({w:0,t:`Hard dediğin kelimelerin %${pct(S.hardFollow.ok/S.hardFollow.n)}'ini ertesi gün hatırladın.`});
  if(lr!==null)ins.push({w:lr>=.25?1:0,t:`Unutma hızın ${lr<.12?"düşük":lr<.25?"orta":"yüksek"}: tekrarların %${pct(lr)}'inde kelime unutuldu.`});
  if(mem&&mem.low>=5)ins.push({w:1,t:`${mem.low} kelimenin hatırlanma olasılığı %50'nin altına düştü; günlük tekrarda önce bunlar geliyor.`});
  // Beceri karşılaştırması: anlam güçlü, eş anlam/bağlam geride
  const acc=k=>{const x=S.err[k];return x.c+x.w>=10?x.c/(x.c+x.w):null};
  const am=acc("mean");for(const k of ["syn","ctx"]){const ak=acc(k);if(am!=null&&ak!=null&&am-ak>=.12){ins.push({w:1,t:`Kelime anlamlarında güçlüsün (%${pct(am)}) ancak ${k==="syn"?"eş anlam":"bağlam"} sorularında aynı başarıyı henüz gösteremiyorsun (%${pct(ak)}).`});break}}
  // Kalıcı hafızaya geçen küme
  const sm=statusMap();const gm={};for(const id in S.cards){if(!BY[id])continue;const g=BY[id].g;gm[g]=gm[g]||{n:0,m:0};gm[g].n++;if(sm[id]==="mastered")gm[g].m++}
  const bestG=Object.entries(gm).filter(([g,x])=>GROUPS[g]&&x.n>=4&&x.m/x.n>=.5).sort((a,b)=>b[1].m/b[1].n-a[1].m/a[1].n)[0];
  if(bestG)ins.push({w:0,t:`${esc(GROUPS[bestG[0]][1])} grubundaki kelimeler kalıcı hafızaya geçiyor (${bestG[1].m}/${bestG[1].n} kalıcı).`});
  // Son 7 gün eğilimi
  const wa=weekStats(today()),wb=weekStats(today()-7);
  for(const k of ["ctx","syn","mean"]){const a=wa.sk[k],b=wb.sk[k];if(a&&b&&a.c+a.w>=8&&b.c+b.w>=8){const x=a.c/(a.c+a.w),y=b.c/(b.c+b.w);if(Math.abs(x-y)>=.05){ins.push({w:x<y?1:0,t:`Son 7 günde ${SKILLS[k].toLocaleLowerCase("tr-TR")} başarın %${pct(y)}'ten %${pct(x)}'e ${x>y?"yükseldi":"geriledi"}.`});break}}}
  ins.push({w:0,t:`Bağlam soruları şu an <b>${CTX_LEVELS[S.ctxLevel]}</b> seviyesinde. Son 10 bağlam sorusunun %80'ini doğru yaparsan zorluk artar.`});
  const pl=plan("daily");if(pl.note)ins.push({w:0,t:esc(pl.note)});
  if(pl.why.length)ins.push({w:0,t:`Günlük oran ayarı: ${pl.why.join(", ")} payı artırıldı.`});
  return ins;
}

