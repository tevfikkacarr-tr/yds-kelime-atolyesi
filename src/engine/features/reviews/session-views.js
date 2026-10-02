/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
function vSession(){
  const ph=SS.phases[SS.pi],it=cur();
  const bars=SS.phases.map((p,i)=>{const w=i<SS.pi?100:i>SS.pi?0:Math.round(SS.ii/Math.max(1,p.items.length)*100);return`<i><b style="width:${w}%"></b></i>`}).join("");
  return`<h1 class="sr">Çalışma oturumu</h1><div class="shead"><button class="iconbtn" data-act="exit" aria-label="Oturumdan çık">×</button><div class="phasebar" aria-hidden="true">${bars}</div><span class="qcount">${SS.q?`${SS.c}/${SS.q}`:""}</span></div>
  <div class="plabel"><span class="eyebrow">${SS.pi+1}/${SS.phases.length} · ${esc(ph.label)}</span><span class="qcount">${SS.ii+1} / ${ph.items.length}</span></div>`+vItem(it);
}
function feedbackFor(it,o){
  const w=it.id?BY[it.id]:null;
  if(it.k==="yds"||it.k==="rdq"){
    const picked=it.opts[SS.ans];
    return`${!picked.ok&&picked.ow?`<span><b>Neden yanlış:</b> ${esc(picked.ow)}</span>`:""}<span><b>Neden doğru:</b> ${esc(it.why||"")}</span>${it.key&&it.key.length?`<span class="muted small">Anahtar kelimeler: ${it.key.map(esc).join(" · ")}</span>`:""}${it.gram?`<span class="muted small">Dil bilgisi / bağlaç: ${esc(it.gram)}</span>`:""}`;
  }
  if(it.k==="trap")return`<span>${esc(it.t.e)}</span>`;
  if(it.k==="clz")return`<span>${esc(it.cz.blanks[it.bi].why)}</span>`;
  if(it.k==="syn"){const okT=it.opts.find(x=>x.ok).t,rl=BY[okT]?relOf(w.id,okT):null;const notes=synNotes(w,okT)+(rl?`<span class="small"><b>${esc(w.w)} ↔ ${esc(okT)}</b> · ${REL_TR[rl[0]]}: ${esc(rl[1])}</span>`:"");
    return`<span class="link-eq">${esc([w.w,...w.syn.slice(0,2)].join(" ≈ "))}</span>${notes}<span class="muted small">Yakın anlamlı, ancak tamamen interchangeable değiller; kalıplara dikkat et.</span>`}
  if(it.k==="cpunct")return`<span>${esc(w.cn.punct)}</span><span class="muted small">${esc(w.cn.position)}</span>`;
  if(it.k==="place")return`<span><b>${esc(w.w)}</b> → ${esc(w.tr)}</span>`;
  if(it.k==="cloze"||it.k==="yctx")return`<span>${esc(w.note)}</span>${w.pat.length?`<span class="muted small">Kalıp: ${w.pat.map(esc).join(" · ")}</span>`:""}`;
  if(it.k==="guess")return`<span><b>${esc(w.w)}</b> → ${esc(w.tr)}.</span><span>${esc(w.hint)}</span>`;
  if(it.k==="coll")return`<span>Doğal kalıplar: ${w.col.map(esc).join(", ")}.</span>${w.pat.length?`<span class="muted small">${w.pat.map(esc).join(" · ")}</span>`:""}`;
  if(it.k==="fam")return`<span>${w.fam.map(f=>`<b>${esc(f[0])}</b> <small class="muted">${esc(f[1])}</small>`).join(" · ")} · <b>${esc(w.w)}</b> <small class="muted">${esc(w.pos)}</small></span>`;
  if(it.k==="pairq")return`<span>${esc(it.p.tip)}</span>`;
  if(it.k==="cstruct"||it.k==="cfunc"||it.k==="cid")return`<span><b>${esc(w.w)}</b>: ${esc(CONN_FN[w.g])}, ${esc(STRUCT_SHORT[w.cn.struct])}. ${esc(w.cn.punct)}</span><span class="muted small">${esc(w.cn.diff)}</span>`;
  return`<span><b>${esc(w.w)}</b> → ${esc(w.tr)} · ${esc(w.col[0])}</span>`;
}
const BTYPE_TR={vocab:"kelime",connector:"bağlaç",preposition:"edat",grammar:"dil bilgisi",collocation:"kalıp"};
/* Kullanım notu: önce anlam merdivenindeki not, yoksa kelimenin nüans notu */
function useNote(id){for(const L of LADBY[id]||[])for(const st of L.steps)if(st.w.includes(id))return st.note;const w=BY[id];return w&&w.nu||""}
function synNotes(w,other){const a=useNote(w.id),b=BY[other]?useNote(other):"";
  if(!a&&!b)return"";return`<span class="small">${a?`<b>${esc(w.w)}</b> → ${esc(a)}`:""}${a&&b?"<br>":""}${b?`<b>${esc(other)}</b> → ${esc(b)}`:""}</span>`}
function recallMode(it){return it.open?"open":"buttons"}
function openRow(it){
  const b=(v,k,lab)=>`<button class="rate ${k}" data-act="orate" data-v="${v}"><b>${lab}</b><small>${rateLabel(it.id,k)}</small></button>`;
  return`<div class="raterow three">${b("dunno","again","Hatırlayamadım")}${b("unsure","hard","Kısmen")}${b("know","good","Doğru hatırladım")}</div>
  <p class="ratehelp">Zihninde söylediğin anlam kartla örtüşüyor mu? Seçimin sonraki tekrar zamanını belirler ve sonraki eş anlam / bağlam sorusuyla doğrulanır. <button class="link" data-act="orate" data-v="easy">Çok kolaydı (Easy · ${rateLabel(it.id,"easy")})</button></p>`;
}
function rateRow(it){
  if(it.open)return openRow(it);
  const sug={know:"good",unsure:"hard",dunno:"again"}[SS.self];
  const open=SS.self==null;
  const lab={again:open?"Hatırlayamadım":"Again",hard:open?"Kısmen":"Hard",good:open?"Doğru":"Good",easy:open?"Hemen":"Easy"};
  const r=k=>`<button class="rate ${k}${sug===k?" sug":""}" data-act="rate" data-v="${k}"><b>${lab[k]}</b><small>${open?{again:"Again",hard:"Hard",good:"Good",easy:"Easy"}[k]+" · ":""}${rateLabel(it.id,k)}</small></button>`;
  return`<div class="raterow">${r("again")}${r("hard")}${r("good")}${r("easy")}</div>
  <p class="ratehelp">${open?"Zihninde söylediğin cevap kartla ne kadar örtüşüyor?":"Ne kadar kolay hatırladın? Çerçeveli olan senin cevabına göre önerilen."} Seçimin bir sonraki tekrarın zamanını belirler. Klavye: 1–4.</p>`;
}
function vItem(it){
  if(it.k==="pair")return vPairCard(it.p,true);
  if(it.k==="ladder")return`${it.L?vSemLadder(it.L):vLadder(it.g,it.ids)}<div style="margin-top:14px"><button class="btn btn-primary" data-act="next">Başla</button></div>`;
  if(it.k==="leech"){const w=BY[it.id],c=S.cards[it.id];const L=(LADBY[it.id]||[])[0];
    const rel=W.filter(x=>x.g===w.g&&x.id!==w.id).sort((a,b)=>b.p-a.p).slice(0,3);
    const cws=[...new Set([...w.cw.filter(x=>BY[x]),...personalPairs().filter(p=>p.ws.includes(w.id)).map(p=>p.ws.find(x=>x!==w.id))])];
    const ctx2=cap((blankSents(w,"cloze").find(([k])=>k!=="cz")||blankSents(w,"cloze")[0])[1].replace("___",w.w));
    return`<div class="card leech"><div class="eyebrow">Farklı yöntem · bu kelime ${c.reps+c.correct+c.wrong} kez görüldü ama henüz oturmadı</div>
    <div class="word">${esc(w.w)}</div><div class="meaning">${esc(w.tr)}</div>
    <div class="sec"><h4>Mini hafıza ipucu</h4><p>${esc(mnemonic(w))}</p></div>
    <div class="sec"><h4>Anlam ailesi</h4><p class="small">${esc(GROUPS[w.g][0])}${L?` · ${esc(L.title)}: ${esc(useNote(w.id))}`:""}</p><div class="chips">${rel.map(x=>`<span class="chip">${esc(x.w)} <small class="muted">${esc(x.tr.split(" / ")[0])}</small></span>`).join("")}</div></div>
    ${w.fam.length?`<div class="sec"><h4>Kelime ailesi</h4><div class="chips">${w.fam.map(f=>`<span class="chip">${esc(f[0])} <small class="muted">${esc(f[1])}</small></span>`).join("")}</div></div>`:""}
    <div class="sec"><h4>Kalıplar</h4><ul class="colls">${w.col.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
    ${cws.length?`<div class="cw">⚠ Karıştırma: ${cws.map(x=>`<b>${esc(x)}</b> (${esc(BY[x].tr.split(" / ")[0])})`).join(", ")}</div>`:""}
    <div class="sec"><h4>İki farklı bağlam</h4><p class="ex">${exHtml(w)}</p><p class="ex">${esc(ctx2)}</p></div></div>
    <div style="margin-top:14px"><button class="btn btn-primary" data-act="next">Kısa teste geç</button></div>`}
  if(it.k==="passage")return`<div class="card"><div class="eyebrow">Okuma köprüsü · ${esc(it.p.title)}</div><p class="ptext">${passageHtml(it.p)}</p><p class="note">Altı çizili kelimeleri son günlerde çalıştın. Önce metni oku; ardından 3 soru gelecek.</p></div><div style="margin-top:14px"><button class="btn btn-primary" data-act="next">Sorulara geç</button></div>`;
  const w=it.id?BY[it.id]:null;
  if(it.k==="flash"||it.k==="learn"||it.k==="connfo"){
    const tags=(it.k!=="flash"&&!it.again&&!S.cards[it.id]?`<span class="tag">yeni</span>`:"")+(isWeak(it.id)?`<span class="tag weak">zayıf</span>`:"")+(it.early?`<span class="tag">erken tekrar</span>`:"");
    if(SS.stage==="front"){
      if(recallMode(it)==="open")return`<div class="card">${head(w,tags)}<p class="prompt"><b>Cevabı görmeden önce anlamını zihninden söyle.</b> Sonra kendini kontrol et.</p></div>
        <div style="margin-top:14px"><button class="btn btn-primary" data-act="reveal">Cevabı göster</button></div>`;
      return`<div class="card">${head(w,tags)}<p class="prompt">Bu kelimenin anlamını hatırlıyor musun? Önce düşün, sonra seç.</p></div>
      <div class="selfrow"><button class="self" data-act="self" data-v="know">Biliyorum</button><button class="self" data-act="self" data-v="unsure">Emin değilim</button><button class="self" data-act="self" data-v="dunno">Bilmiyorum</button></div>`;
    }
    return`<div class="card">${head(w,tags)}${cardBody(w,SS.fam||it.k==="connfo")}</div>${rateRow(it)}`;
  }
  if(it.k==="reverse"){
    if(SS.stage==="front")return`<div class="card"><div class="eyebrow">Ters hatırlama · Türkçe → İngilizce</div><div class="meaning" style="font-size:26px">${esc(w.tr)}</div><p class="prompt">İngilizcesini zihninden söyle ve cevabı aç. (${esc(POS_TR[w.pos.split("/")[0]]||w.pos)}, ${w.w.length} harf)</p></div>
      <div style="margin-top:14px"><button class="btn btn-primary" data-act="reveal">Cevabı aç</button></div>`;
    return`<div class="card"><div class="eyebrow">Ters hatırlama</div><div class="word">${esc(w.w)}</div><div class="meaning">${esc(w.tr)}</div><p class="ex">${exHtml(w)}</p></div>
      <div class="btn-row" style="margin-top:14px"><button class="btn btn-ghost" data-act="rev" data-v="0">Hatırlayamadım</button><button class="btn btn-primary" data-act="rev" data-v="1">Hatırladım</button></div>
      <p class="ratehelp">Ters hatırlama tekrar programını değiştirmez; yalnızca anlam becerine işlenir.</p>`;
  }
  const answered=SS.ans!==null;let q;
  const fillBlank=(s,word)=>{const parts=s.split("___");return`${esc(parts[0])}<span class="blank${answered?" fill":""}">${answered?esc(word):"&nbsp;"}</span>${esc(parts[1]||"")}`};
  if(it.k==="yds"||it.k==="rdq")q=`<span class="qtype">${YT[it.yt]}</span>${it.stem}`;
  else if(it.k==="trap")q=`<p class="eyebrow">Kelime tuzağı · ${esc(it.t.pair)}</p><p class="sent">${fillBlank(it.t.s,it.t.o[it.t.a])}</p>`;
  else if(it.k==="clz")q=`<p class="eyebrow">Cloze köprüsü · ${esc(it.cz.title)} · boşluk ${it.bi+1}/${it.cz.blanks.length} · ${esc(BTYPE_TR[it.cz.blanks[it.bi].type]||"")}</p><p class="ptext">${clozeHtml(it)}</p>`;
  else if(it.k==="syn")q=`<p class="qtext">Which word is closest in meaning to <q>${esc(w.w)}</q>?</p>`;
  else if(it.k==="mean"){it.stemI=it.stemI??Math.floor(Math.random()*MEAN_STEMS.length);q=`<p class="qtext">${MEAN_STEMS[it.stemI](esc(w.tr))}</p>`}
  else if(it.k==="guess")q=`<p class="eyebrow">Bağlam · Kolay · tahmin</p><p class="sent">${exHtml(w)}</p><p class="qtext">What does <q>${esc(w.w)}</q> most likely mean?</p>`;
  else if(it.k==="coll")q=`<p class="eyebrow">Kalıp · ${esc(w.w)}</p><p class="qtext">Which combination is most natural?</p>`;
  else if(it.k==="cstruct")q=`<p class="eyebrow">Bağlaç ustası · yapı</p><p class="qtext"><q>${esc(w.w)}</q> bağlacından sonra hangi yapı gelir?</p>`;
  else if(it.k==="cfunc")q=`<p class="eyebrow">Bağlaç ustası · işlev</p><p class="qtext"><q>${esc(w.w)}</q> hangi anlam ilişkisini kurar?</p>`;
  else if(it.k==="cid")q=`<p class="eyebrow">Bağlaç ustası · seçim</p><p class="qtext">Anlamı <b>${esc(CONN_FN[w.g])}</b> olan ve ardından <b>${esc(STRUCT[w.cn.struct])}</b> gelen bağlaç hangisidir?</p>`;
  else if(it.k==="yctx")q=`<p class="eyebrow">Bağlam · YDS düzeyi</p><p class="sent long">${fillBlank(it.sent||w.x2,w.w)}</p>`;
  else if(it.k==="cpunct")q=`<p class="eyebrow">Bağlaç ustası · konum ve noktalama</p><p class="qtext"><q>${esc(w.w)}</q> ile kurulmuş, konum ve noktalama açısından doğru cümle hangisidir?</p>`;
  else if(it.k==="place")q=`<p class="eyebrow">Seviyemi ölç · ${SS.ii+1}/${SS.phases[SS.pi].items.length}</p><p class="qtext"><q>${esc(w.w)}</q> kelimesinin anlamı hangisidir?</p>`;
  else{const lab=it.k==="fam"?`Kelime ailesi · doğru biçimi seç`:it.k==="pairq"?`Karıştırılan kelimeler · ${esc(it.p.ws.join(" / "))}`:"Bağlam · Orta · boşluğa en uygun kelime";
    q=`<p class="eyebrow">${lab}</p><p class="sent">${fillBlank(it.k==="cloze"&&it.sent?it.sent:w.cz,w.w)}</p>`}
  const long=(it.k==="yds"||it.k==="rdq")&&["sc","tr","rs","pc","rd"].includes(it.yt)||it.k==="cstruct"||it.k==="cpunct";
  const opts=it.opts.map((o,i)=>{let c="",mk="";if(answered){if(o.ok){c=" ok";mk=`<span class="mk">✓ doğru</span>`}else if(i===SS.ans){c=" bad";mk=`<span class="mk">✗ seçimin</span>`}else c=" dim"}
    return`<button class="opt${long?" long":""}${c}" data-act="ans" data-v="${i}"${answered?" disabled":""}><span class="k">${"ABCDE"[i]})</span><span class="ot">${esc(o.t)}</span>${mk}</button>`}).join("");
  let fb="";
  if(answered){
    const o=it.opts[SS.ans],ok=o.ok;let conf="";
    if(!ok&&o.wid&&BY[o.wid]&&w&&o.wid!==w.id){const pw=BY[o.wid];const pr=PAIRMAP[pairKey(w.id,pw.id)]||w.cw.includes(pw.id);conf=`<span class="muted">${esc(pw.w)} = ${esc(pw.tr)}${pr?" · Bu iki kelime sık karıştırılır; karşılaştırma kartını günün zor kelimelerinde göreceksin.":""}</span>`}
    fb=`<div class="fb" role="status"><span class="v ${ok?"ok":"bad"}">${ok?"✓ Doğru.":"✗ Doğru cevap: "+esc(it.opts.find(x=>x.ok).t)}</span>${feedbackFor(it,o)}${conf}</div><button class="btn btn-primary" data-act="next" id="nextbtn">Devam</button>
    <button class="link flaglink" data-act="flagopen">${SS.flagged?"✓ Bildirim kaydedildi":"Bu soruda sorun var"}</button>`;
  }
  return`<div class="card">${q}</div><div class="stack" style="margin-top:14px"><div class="opts" role="group" aria-label="Seçenekler">${opts}</div>${fb}</div>`;
}
function passageHtml(p){
  let h=esc(p.text);
  for(const id of p.words){const w=BY[id];if(!w||!S.cards[id])continue;const re=new RegExp("\\b("+w.w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\w*)","i");h=h.replace(re,"<u>$1</u>")}
  return h;
}
function clozeHtml(it){
  const c=it.cz;
  return esc(c.text).replace(/\{(\d)\}/g,(m,n)=>{const i=+n-1;
    if(i===it.bi)return`<span class="blank cur${SS.ans!==null?" fill":""}">(${n}) ${SS.ans!==null?esc(c.blanks[i].o[c.blanks[i].a]):"&nbsp;"}</span>`;
    if(i<it.bi)return`<span class="blank fill">${esc(c.blanks[i].o[c.blanks[i].a])}</span>`;
    return`<span class="blank">(${n})</span>`});
}
function vPairCard(p,inSession){
  const col=id=>{const w=BY[id];return`<div class="pcol"><div class="wtype">${esc(posLabel(w.pos))}</div><div class="word">${esc(w.w)}</div><div class="meaning">${esc(w.tr)}</div><p class="ex">${exHtml(w)}</p><p class="extr">${esc(w.col.slice(0,2).join(" · "))}</p></div>`};
  return`<div class="card"><div class="eyebrow">Karşılaştırma kartı</div><div class="pair">${p.ws.map(col).join("")}</div><div class="fb">${esc(p.tip)}</div></div>
  ${inSession?`<div style="margin-top:14px"><button class="btn btn-primary" data-act="next">Anladım</button></div>`:""}`;
}
/* Anlam merdiveni (elle tanımlı): temel anlam → akademik kullanım → daha güçlü / daha özel kullanım */
function vSemLadder(L){
  const sm=statusMap(),cm=clusterMastery(ladderWords(L));
  const steps=L.steps.map((st,i)=>`<li><span class="lv">${i+1}. basamak</span><div class="lw">${st.w.map(id=>`<button class="chipbtn" data-act="detail" data-v="${esc(id)}"><b>${esc(id)}</b> <small class="muted">${esc(BY[id].tr.split(" / ")[0])}</small>${sm[id]==="mastered"?" ✓":""}</button>`).join(`<span class="muted">/</span>`)}<span class="nu">→ ${esc(st.note)}</span></div></li>`).join("");
  return`<div class="card"><div class="eyebrow">${esc(L.title)} · anlam merdiveni · küme ustalığı ${cm.score}/100</div>
  <p class="small muted">Temel anlamdan akademik kullanıma ve daha güçlü / daha özel kullanıma doğru. Yakın anlamlı, ancak tamamen interchangeable değiller: her basamağın notu farkı söyler.</p><ol class="ladder">${steps}</ol></div>`;
}
/* Küme görünümü: seviye sırası + kümeye bağlı elle tanımlı merdivenler */
function vLadder(g,ids){
  const ws=(ids?ids.map(id=>BY[id]):W.filter(w=>w.g===g)).slice().sort((a,b)=>a.l-b.l||b.p-a.p);
  const sm=statusMap();
  const steps=[1,2,3,4,5].map(l=>{const xs=ws.filter(w=>w.l===l);if(!xs.length)return"";
    return`<li><span class="lv">L${l} · ${esc(LEVELS[l])}</span><div class="lw">${xs.map(w=>`<button class="chipbtn" data-act="detail" data-v="${esc(w.id)}"><b>${esc(w.w)}</b> <small class="muted">${esc(w.tr.split(" / ")[0])}</small>${sm[w.id]==="mastered"?" ✓":""}</button>${useNote(w.id)?`<span class="nu">${esc(useNote(w.id))}</span>`:""}`).join("")}</div></li>`}).join("");
  const gm=groupMastery(g);
  const lads=LADDERS.filter(L=>ladderWords(L).some(id=>BY[id]&&BY[id].g===g));
  return`<div class="card"><div class="eyebrow">${esc(GROUPS[g][0])} · seviyeye göre · küme ustalığı ${gm.score}/100</div>
  <p class="small muted">Yakın anlamlı, ancak tamamen interchangeable değiller. Notlar her kelimenin kullanım farkını söyler.</p><ol class="ladder">${steps}</ol>
  ${lads.length?`<div class="chips">${lads.map(L=>`<button class="chipbtn" data-act="ladderopen" data-v="${esc(L.id)}">Anlam merdiveni: ${esc(L.title)}</button>`).join("")}</div>`:""}</div>`;
}

