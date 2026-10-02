/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
function vHome(){
  const t=today(),done=S.doneDay===t,p=plan("daily");
  const date=new Date().toLocaleDateString("tr-TR",{weekday:"long",day:"numeric",month:"long"});
  const total=p.newIds.length+p.review.length+p.weak.length+p.early.length;
  const sm=statusMap();const mastered=Object.values(sm).filter(x=>x==="mastered").length;
  const weakN=weakList().length,dueN=p.dueAll.length;
  const seg=Object.entries(LEN).map(([k,v])=>`<button data-act="len" data-v="${k}" aria-pressed="${S.settings.length===k}">${v.label}<small>${v.min} dk</small></button>`).join("");
  let body;
  if(done){
    const tomorrow=Object.values(S.cards).filter(c=>c.due<=t+1).length;
    body=`<div><div class="eyebrow">Bugünkü çalışma</div><h1>Bugünün çalışması tamam.</h1></div>
    <p class="muted">Yarın <b class="num" style="color:var(--ink)">${tomorrow}</b> kelime tekrar için hazır olacak. Aynı gün aşırı tekrar uzun süreli hafızaya katkı sağlamaz; biraz unutup yeniden hatırlamak kalıcılığı artırır.</p>
    <button class="btn btn-ghost" data-act="extra">Ek çalışma: 5 yeni kelime${weakN?` + zayıf kelimeler`:""}</button>`;
  }else if(!total){
    body=`<div><div class="eyebrow">Bugünkü çalışma</div><h1>Bugün tekrar zamanı gelen kelime yok.</h1></div><p class="muted">${S.noNewDay===t?"Bugün yeni kelime almamayı seçtin.":"Havuzdaki bütün kelimeleri öğrendin."}</p>${S.noNewDay===t?`<button class="link" data-act="nonew">Yeni kelimeleri yeniden aç</button>`:""}`;
  }else{
    body=`<div><div class="eyebrow">Bugünkü çalışma · ${loadBadge(p)}</div><h1>Hatırla, ilişkilendir ve kullan.</h1></div>
    <div class="planline"><span><b>${p.newIds.length}</b> yeni</span><span><b>${p.review.length+p.early.length}</b> tekrar</span><span class="w"><b>${p.weak.length}</b> zayıf</span><span>yaklaşık <b>${p.minutes} dk</b></span></div>
    <div class="lenrow"><span class="seg" role="group" aria-label="Çalışma süresi">${seg}</span><button class="link" data-act="nonew">${S.noNewDay===t?"Yeni kelimeleri yeniden aç":"Bugün yeni kelime istemiyorum"}</button></div>
    ${(()=>{const tip=homeTip();return tip?`<p class="tip">${esc(tip)}</p>`:p.note?`<p class="notice">${esc(p.note)}</p>`:""})()}
    ${p.overflow.length?`<p class="notice">Kapasiteyi aşan ${p.overflow.length} tekrar, en iyi hatırladıkların önce olmak üzere sonraki günlere yayılacak.</p>`:""}
    <button class="btn btn-primary" data-act="start">BUGÜNKÜ ÇALIŞMAYA BAŞLA</button>`;
  }
  return`<header class="topbar"><div><div class="eyebrow">${esc(date)}</div><div class="brand">YDS Kelime Atölyesi</div></div></header>
  <div class="stack">
    <section class="stats4">
      <div class="stat"><span class="n">${streakNow()}</span><span class="l">Gün seri · en iyi ${S.best||0} · ${days30()}/30</span></div>
      <div class="stat"><span class="n">${dueN}</span><span class="l">Tekrar bekleyen</span></div>
      <div class="stat weak"><span class="n">${weakN}</span><span class="l">Zayıf kelime</span></div>
      <div class="stat mast"><span class="n">${mastered}</span><span class="l">Kalıcı kelime</span></div>
    </section>
    ${(()=>{const ps=pendingSession();return ps?`<section class="panel resume" role="status"><p><b>Yarım kalan çalışman var.</b> Cevapların kaydedildi; kaldığın yerden devam edebilirsin.</p><div class="btn-row"><button class="btn btn-ghost btn-sm" data-act="discard">Vazgeç</button><button class="btn btn-primary btn-sm" data-act="resume">Devam et</button></div></section>`:""})()}
    ${weeklyDue()?`<button class="sc wide banner" data-act="weekly"><b>Haftalık raporun hazır</b><span>Son 7 günün özeti ve gelecek haftanın odak kelimeleri</span></button>`:""}
    <section class="today">${body}</section>
    <section class="shortcuts">
      <button class="sc" data-act="quick"${dueN?"":" disabled"}><b>Hızlı tekrar</b><span>${dueN?`${Math.min(dueN,30)} kelime, önce unutulmaya yakın olanlar`:"Bekleyen tekrar yok"}</span></button>
      <button class="sc" data-act="ydsopen"><b>Mini YDS</b><span>5–40 soru · ${BANK.length+RD.length} soruluk banka</span></button>
      <button class="sc" data-act="weak"${weakN?"":" disabled"}><b>Zayıf kelimeler</b><span>${weakN?`${Math.min(weakN,8)} kelime, farklı soru tipleri`:"Şu an zayıf kelime yok"}</span></button>
      <button class="sc" data-act="tab" data-v="study"><b>Diğer modlar</b><span>Bağlaç, tuzak, okuma, cloze</span></button>
    </section>
    <p class="slogan">Ezberleme. Hatırla, ilişkilendir ve kullan.</p>
    <p class="flow">Gör → Hatırla → Bağla → Kullan → Biraz unut → Yeniden hatırla → Kalıcı</p>
  </div>`;
}

