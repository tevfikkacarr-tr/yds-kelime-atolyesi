/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
function vSummary(){
  const s=summary;if(!s){tab="home";return vHome()}
  const acc=s.q?pct(s.c/s.q):null;
  if(s.type==="yds"){
    const mm=Math.floor(s.secs/60),ss=String(s.secs%60).padStart(2,"0");
    const types=Object.entries(s.bt).map(([k,x])=>`<div class="brow"><span>${YT[k]} <span class="muted small">(${x.c}/${x.c+x.w})</span></span><span class="num">%${pct(x.c/(x.c+x.w))}</span><div class="bar g"><i style="width:${pct(x.c/(x.c+x.w))}%"></i></div></div>`).join("");
    const wrong=s.log.filter(l=>!l.ok),right=s.log.filter(l=>l.ok);
    const entry=l=>`<article class="lrn"><div class="qtype">${YT[l.yt]}</div><p class="small">${esc(l.q)}</p>
      ${!l.ok?`<p class="small"><span class="badtxt">✗ Senin cevabın:</span> ${esc(l.o[l.picked])}${l.ow[l.picked]?` · <span class="muted">${esc(l.ow[l.picked])}</span>`:""}</p>`:""}
      <p class="small"><span class="oktxt">✓ Doğru:</span> ${esc(l.o[l.a])} · ${esc(l.why||"")}</p>
      ${l.key&&l.key.length?`<p class="small muted">Anahtar kelimeler: ${l.key.map(esc).join(" · ")}</p>`:""}${l.gram?`<p class="small muted">Dil bilgisi / bağlaç: ${esc(l.gram)}</p>`:""}</article>`;
    return`<div class="stack"><div><div class="eyebrow">Mini YDS sonucu</div><h1 class="sumhead">${s.c} / ${s.n} doğru</h1></div>
    <section class="panel"><div class="sumgrid"><span>Puan</span><b>${pct(s.c/s.n)} / 100</b><span>Süre</span><b>${mm}:${ss}</b><span>Soru başına</span><b>${Math.round(s.secs/s.n)} sn</b></div><p class="note">Puan yalnızca bu mini testteki doğru oranıdır; YDS sınav puanı tahmini değildir.</p></section>
    <section class="panel"><h2>Soru tipine göre</h2><div class="bars">${types}</div></section>
    <section class="panel"><h2>Öğrenme modu <small>· neden yanlış, neden doğru</small></h2>${wrong.length?wrong.map(entry).join(""):`<p class="small muted">Yanlış yok.</p>`}
      ${right.length?`<details><summary class="small">Doğru yaptığın ${right.length} sorunun açıklamaları</summary>${right.map(entry).join("")}</details>`:""}</section>
    ${s.weak.length?`<section class="panel"><h2>Bu testte zorlandığın kelimeler</h2><div class="chips">${s.weak.map(id=>`<button class="chipbtn" data-act="detail" data-v="${esc(id)}">${esc(id)}</button>`).join("")}</div></section>`:""}
    <div class="btn-row"><button class="btn btn-ghost" data-act="ydsopen">Yeni test</button><button class="btn btn-primary" data-act="tab" data-v="home">Ana ekran</button></div></div>`;
  }
  if(s.type==="place"){const P=s.placement,TR={Strong:"Güçlü",Developing:"Gelişiyor",Limited:"Sınırlı"};
    const row=(lab,k)=>`<span>${lab}</span><b>${P[k]} · ${TR[P[k]]||""} <span class="muted small">(${P.raw[k].c}/${P.raw[k].n})</span></b>`;
    return`<div class="stack"><div><div class="eyebrow">Seviyemi ölç</div><h1 class="sumhead">Başlangıç kelime seviyen</h1></div>
    <section class="panel"><div class="sumgrid">${row("Core Vocabulary · temel","core")}${row("Intermediate · orta","inter")}${row("Advanced · ileri","adv")}</div>
    <p class="note">Bu yalnızca kelime tanıma düzeyinin kaba bir tahminidir; YDS puanı değildir. Doğru bildiğin kelimeler yeni kelime sırasında biraz geriye alındı, böylece önce bilmediklerin gelir.</p></section>
    <div class="btn-row"><button class="btn btn-ghost" data-act="tab" data-v="study">Diğer modlar</button><button class="btn btn-primary" data-act="start">Çalışmaya başla</button></div></div>`}
  if(["read","clz","trap","conn"].includes(s.type)){
    const title={read:"Okuma köprüsü tamam",clz:"Cloze köprüsü tamam",trap:"Kelime tuzağı tamam",conn:"Bağlaç çalışması tamam"}[s.type];
    return`<div class="stack"><div><div class="eyebrow">Özet</div><h1 class="sumhead">${title}</h1></div>
    <section class="panel"><div class="sumgrid"><span>Doğru cevap</span><b>${s.c} / ${s.q}</b>${s.rl!=null?`<span>Okuma seviyesi</span><b>${READ_LABEL[READ_LEVELS[s.rl]]}</b>`:""}</div>${acc!==null&&s.q?`<div class="acc"><span class="n">%${acc}</span><span class="muted">doğruluk</span></div>`:""}
    ${s.rch?`<p class="small">Son okuma sorularındaki başarına göre okuma seviyesi <b>${READ_LABEL[READ_LEVELS[s.rl]]}</b> düzeyine ${s.rch==="up"?"yükseldi":"indi"}.</p>`:""}</section>
    ${s.hard.length?`<section class="panel"><h2>Zorlandığın kelimeler</h2><div class="chips">${s.hard.filter(id=>BY[id]).map(id=>`<button class="chipbtn" data-act="detail" data-v="${esc(id)}">${esc(id)}</button>`).join("")}</div></section>`:""}
    <div class="btn-row"><button class="btn btn-ghost" data-act="tab" data-v="study">Diğer modlar</button><button class="btn btn-primary" data-act="tab" data-v="home">Ana ekran</button></div></div>`;
  }
  const area=a=>a?`${SKILLS[a.k]} <span class="muted small">%${pct(a.a)}</span>`:"Henüz yeterli veri yok";
  const cl=Object.entries(s.clusters||{}).map(([g,ids])=>`<div class="lcl"><span class="eyebrow">${esc(GROUPS[g][0])}</span><div class="chips">${ids.map(id=>`<button class="chipbtn" data-act="detail" data-v="${esc(id)}">${esc(id)} <small class="muted">${esc(BY[id].tr.split(" / ")[0])}</small></button>`).join("")}</div></div>`).join("");
  return`<div class="stack">
  <div><div class="eyebrow">Today's Summary · Bugünün özeti</div><h1 class="sumhead">${s.type==="pair"?"Karşılaştırma tamam":s.type==="weak"?"Zayıf kelime çalışması":s.type==="quick"?"Hızlı tekrar tamam":s.type==="cluster"?"Küme çalışması tamam":"Bugün"}</h1></div>
  <section class="panel">
    <div class="sumgrid">
      <span>Yeni kelime</span><b>${s.n}</b>
      <span>Tekrar edilen</span><b>${s.r}</b>
      <span>Doğru cevap</span><b>${s.c} / ${s.q}</b>
      <span>Bugün kalıcı olan</span><b>${s.mastered}</b>
      <span>Zayıf kelime (şu an)</span><b>${s.weakNow}</b>
      ${s.rev&&s.rev.n?`<span>Ters hatırlama</span><b>${s.rev.ok} / ${s.rev.n}</b>`:""}
      ${s.deferred?`<span>Sonraki günlere yayılan</span><b>${s.deferred}</b>`:""}
    </div>
    ${acc!==null&&s.q?`<div class="acc"><span class="n">%${acc}</span><span class="muted">doğruluk</span></div><div class="bar g"><i style="width:${acc}%"></i></div>`:""}
  </section>
  ${s.keep3&&s.keep3.length?`<section class="panel"><h2>Bugünden aklında kalması gereken ${s.keep3.length} kelime</h2><ul class="keep3">${s.keep3.map(x=>`<li><button class="link" data-act="detail" data-v="${esc(x.id)}"><b>${esc(x.id)}</b></button> → ${esc(x.tr)}${x.col?` <span class="muted small">· ${esc(x.col)}</span>`:""}</li>`).join("")}</ul></section>`:""}
  ${cl?`<section class="panel"><h2>Bugün ne öğrendim? <small>· kümelere göre</small></h2>${cl}</section>`:""}
  <section class="areas"><div class="area"><span>En güçlü alan</span><b>${area(s.best)}</b></div><div class="area"><span>Geliştirilmeli</span><b>${area(s.worst)}</b></div></section>
  <section class="panel"><p>Yarın <b class="num">${s.tomorrow}</b> kelime tekrar için hazır olacak.${s.ctx1!==s.ctx0?` Bağlam soruları <b>${CTX_LEVELS[s.ctx1]}</b> seviyesine ${s.ctx1>s.ctx0?"yükseldi":"indi"}.`:""}</p></section>
  ${s.hard.length?`<section class="panel"><h2>Zorlandığın kelimeler</h2><div class="chips">${s.hard.map(id=>`<button class="chipbtn" data-act="detail" data-v="${esc(id)}">${esc(id)}</button>`).join("")}</div><p class="note">Bu kelimeler yarın tekrar programına alındı.</p></section>`:""}
  <div class="btn-row"><button class="btn btn-ghost" data-act="read">Okuma köprüsü</button><button class="btn btn-primary" data-act="tab" data-v="home">Ana ekrana dön</button></div></div>`;
}

