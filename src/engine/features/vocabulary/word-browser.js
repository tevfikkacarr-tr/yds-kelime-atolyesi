/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
const WFILT={all:()=>true,fav:id=>isFav(id),learned:id=>!!S.cards[id],weak:id=>statusMap()[id]==="weak",mastered:id=>statusMap()[id]==="mastered",new:id=>!S.cards[id]};
function vWords(){
  const q=wq.trim().toLocaleLowerCase("tr-TR");
  const filt=WFILT[wf]||WFILT.all;
  const counts={all:W.length,fav:S.fav.filter(id=>BY[id]).length,learned:Object.keys(S.cards).filter(id=>BY[id]).length,weak:weakList().length};
  const fb=(k,l)=>`<button class="chipbtn" data-act="wf" data-v="${k}" aria-pressed="${wf===k}">${l}${counts[k]!=null?`<span class="num">${counts[k]}</span>`:""}</button>`;
  return`<div class="stack">
  <div><div class="eyebrow">${W.length} kelime (${CORE_N} çekirdek + ${SUPPORT_N} destek) · ${Object.keys(GROUPS).length} anlamsal küme · ${LADDERS.length} anlam merdiveni · 5 seviye</div><h1 class="sumhead" style="font-size:27px">Kelime gezgini</h1></div>
  <input class="search" id="wsearch" type="search" placeholder="Kelime ya da Türkçe anlam ara (ör. decline, azalmak)" value="${esc(wq)}" autocomplete="off" aria-label="Kelime ara">
  <div class="filters" role="group" aria-label="Filtre">${fb("all","Tümü")}${fb("fav","Favoriler")}${fb("learned","Öğrenilen")}${fb("weak","Zayıf")}${fb("mastered","Kalıcı")}${fb("new","Yeni")}</div>
  ${wf==="fav"&&counts.fav?`<button class="btn btn-ghost" data-act="favstudy">Favorileri çalış (${Math.min(counts.fav,20)} kelime)</button>`:""}
  <div id="wresults">${vWordResults(q,filt)}</div>
  </div>`;
}
function vWordResults(q,filt){
  const norm=s=>(s||"").toLocaleLowerCase("tr-TR");
  const match=w=>!q||norm(w.w).includes(q)||norm(w.tr).includes(q)||norm(w.tr2).includes(q)||w.syn.some(s=>norm(s)===q);
  const t=today(),sm=statusMap();
  const row=w=>{const st=sm[w.id],c=S.cards[w.id];return`<button class="wrow" data-act="detail" data-v="${esc(w.id)}"><span class="w">${esc(w.w)}<span class="lvl">L${w.l}</span>${isFav(w.id)?`<span class="favmark" aria-label="favori">★</span>`:""}</span><span class="st"><span class="pill ${st}">${STATUS[st]}</span>${c&&c.due<=t?`<span class="duemark">tekrar zamanı</span>`:""}</span><span class="t">${esc(w.tr)}</span></button>`};
  if(q){
    const res=W.filter(w=>match(w)&&filt(w.id)).sort((a,b)=>(norm(b.w).startsWith(q)-norm(a.w).startsWith(q))||(b.p-a.p));
    return res.length?`<div class="gblock"><div class="gtitle"><h3>ARAMA SONUÇLARI</h3><span class="qcount">${res.length}</span></div>${res.slice(0,60).map(row).join("")}</div>`:`<p class="muted" style="padding-top:12px">“${esc(wq)}” için sonuç yok.</p>`;
  }
  let shown=0,html="";
  for(const g of Object.keys(GROUPS)){
    if(shown>=wlimit)break;
    const ws=W.filter(w=>w.g===g&&filt(w.id)).sort((a,b)=>b.p-a.p);if(!ws.length)continue;
    const known=W.filter(w=>w.g===g&&S.cards[w.id]).length,all=W.filter(w=>w.g===g).length;
    const take=ws.slice(0,Math.max(0,wlimit-shown));shown+=take.length;
    html+=`<div class="gblock"><div class="gtitle"><h3>${esc(GROUPS[g][0])}</h3><span class="qcount">${known}/${all}</span></div>${take.map(row).join("")}</div>`;
  }
  const total=W.filter(w=>filt(w.id)).length;
  if(!html)return`<p class="muted" style="padding-top:12px">Bu filtrede kelime yok.</p>`;
  return html+(total>shown?`<div class="more"><button class="btn btn-ghost btn-sm" data-act="more">Daha fazla göster (${total-shown})</button></div>`:"");
}

