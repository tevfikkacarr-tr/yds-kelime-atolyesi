/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= GÖRÜNÜMLER ================= */
function announce(msg){const el=document.getElementById("live");if(el){el.textContent="";setTimeout(()=>{el.textContent=msg},30)}}
function starBtn(id){return`<button class="star" data-act="fav" data-v="${esc(id)}" aria-pressed="${isFav(id)}" aria-label="${isFav(id)?"Favorilerden çıkar":"Favorilere ekle"}">${isFav(id)?"★":"☆"}</button>`}
function head(w,tags){return`<div class="whead"><div class="wtype">${esc(posLabel(w.pos))} · L${w.l} ${esc(LEVELS[w.l])}${tags||""}</div><div class="word">${esc(w.w)}</div>${starBtn(w.id)}</div>`}
function related(w){
  const same=W.filter(x=>x.g===w.g&&x.id!==w.id);
  same.sort((a,b)=>((w.syn.includes(b.w)||b.syn.includes(w.w))-(w.syn.includes(a.w)||a.syn.includes(w.w)))||(b.p-a.p));
  const opp=GROUPS[w.g]&&GROUPS[w.g][2];
  let anti=w.ant.filter(a=>BY[a]).map(a=>BY[a]);
  if(opp)W.filter(x=>x.g===opp).sort((a,b)=>b.p-a.p).forEach(x=>{if(!anti.includes(x))anti.push(x)});
  return{rel:same.slice(0,4),anti:anti.slice(0,4),opp};
}
function connPanel(w){
  if(!w.cn)return"";
  return`<div class="sec conn"><h4>Bağlaç ustası · ${esc(CONN_FN[w.g]||"")}</h4>
  <dl class="cdl"><dt>Yapı</dt><dd><b>${esc(w.w)}</b> ${esc(STRUCT_SHORT[w.cn.struct])} · ${esc(STRUCT[w.cn.struct])}</dd>
  <dt>Konum</dt><dd>${esc(w.cn.position)}</dd><dt>Noktalama</dt><dd>${esc(w.cn.punct)}</dd><dt>Farkı</dt><dd>${esc(w.cn.diff)}</dd></dl></div>`;
}
/* Aşamalı gösterim: ilk karşılaşma → anlam, 2 eş anlam, 2 kalıp, 1 örnek; tanıdık → aile, dil bilgisi kalıbı, ek bağlam, ağ; kalıcı → nüans, yakın eş anlamlar, ileri kalıplar, aktarım */
function cardStage(w,full){if(full)return 3;const c=S.cards[w.id];if(!c||!c.reps)return 1;if(statusMap()[w.id]==="mastered")return 3;return(c.step>=2||c.cdays.length>=2)?2:1}
function cardBody(w,fullFam){
  const c=S.cards[w.id],st=cardStage(w,fullFam);
  const {rel,anti,opp}=related(w);
  const chain=[...new Set([w.w,...w.syn.slice(0,2),w.en].filter(Boolean))].join(" → ");
  const cws=w.cw.filter(x=>BY[x]);
  const extra=st>=2?(blankSents(w,"cloze").find(([k])=>k!=="cz")||[])[1]:null;
  const near=st>=3?w.syn.filter(x=>BY[x]).map(x=>({x,r:relOf(w.id,x)})).filter(o=>o.r):[];
  const tf=st>=3&&c?transferScore(w.id):null;
  const more=st<3&&!fullFam?`<button class="link" data-act="famopen">Daha fazla bilgi göster</button>`:"";
  return`<div><div class="meaning">${esc(w.tr)}</div>${w.tr2&&st>=2?`<div class="meaning2">Diğer anlam: ${esc(w.tr2)}</div>`:""}</div>
  <div class="two">
    <div class="sec"><h4>Eş anlamlılar</h4><div class="chips">${w.syn.slice(0,st>=2?4:2).map(s=>`<span class="chip">${esc(s)}</span>`).join("")}</div>
    ${st>=2&&w.ant.length?`<div class="chips">${w.ant.slice(0,2).map(s=>`<span class="chip ant">≠ ${esc(s)}</span>`).join("")}</div>`:""}
    ${st>=3&&(w.nu||useNote(w.id))?`<p class="small muted">${esc(w.nu||useNote(w.id))}</p>`:""}</div>
    <div class="sec"><h4>Sık kalıplar</h4><ul class="colls">${w.col.slice(0,st>=3?9:2).map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div>
  </div>
  ${st>=2&&w.pat.length?`<div class="sec"><h4>Dil bilgisi kalıbı · grammar pattern</h4><div class="chips">${w.pat.map(s=>`<span class="chip pat">${esc(s)}</span>`).join("")}</div></div>`:""}
  ${st>=2||isLink(w)?connPanel(w):""}
  <div class="sec"><h4>YDS örneği</h4><p class="ex">${exHtml(w)}</p><p class="extr">${esc(w.exTr)}</p>${extra?`<p class="extr">${esc(cap(extra.replace("___",w.w)))}</p>`:""}</div>
  ${st>=2&&w.fam.length?`<div class="sec"><h4>Kelime ailesi</h4><div class="chips">${w.fam.map(f=>`<span class="chip">${esc(f[0])} <small class="muted">${esc(f[1])}</small></span>`).join("")}</div></div>`:""}
  ${st>=2?`<div class="sec"><h4>Kelime ağı</h4><div class="net">
    ${rel.length?`<div class="netrow"><span class="lab">İlişkili</span><span class="ws">${rel.map(m=>`<span>${esc(m.w)} <small>${esc(m.tr.split(" / ")[0])}</small></span>`).join("")}</span></div>`:""}
    ${anti.length?`<div class="netrow"><span class="lab">${opp?"Karşıt grup":"Zıt"}</span><span class="ws">${anti.map(m=>`<span>${esc(m.w)} <small>${esc(m.tr.split(" / ")[0])}</small></span>`).join("")}</span></div>`:""}
    <div class="netrow"><span class="lab">Hafıza bağı</span><span class="chain">${esc(chain)}</span></div>
  </div></div>`:""}
  ${near.length?`<div class="sec"><h4>Yakın eş anlamlar</h4><p class="small">${near.map(o=>`<b>${esc(o.x)}</b> · ${REL_TR[o.r[0]]}: ${esc(o.r[1])}`).join("<br>")}</p></div>`:""}
  ${tf?`<p class="small muted">Sınav benzeri sorularda kullanım (aktarım): ${tf.score}/100</p>`:""}
  ${(st>=2||fullFam)&&cws.length?`<div class="cw">⚠ Karıştırma: ${cws.map(x=>`<b>${esc(x)}</b> (${esc(BY[x].tr.split(" / ")[0])})`).join(", ")}</div>`:""}
  ${(st>=2||fullFam)&&w.cwx?`<div class="cw">⚠ ${esc(w.cwx)}</div>`:""}
  ${more}`;
}
function loadBadge(p){return`<span class="load ${p.load}"><span aria-hidden="true">${p.load==="light"?"○":p.load==="normal"?"◐":"●"}</span> ${LOAD[p.load]} yük</span>`}

