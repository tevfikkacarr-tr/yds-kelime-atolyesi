/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
const closeBtn=`<button class="iconbtn" data-act="close" aria-label="Kapat">×</button>`;
function vSheet(){
  if(!sheet)return"";let inner="";
  if(sheet.type==="detail")inner=vDetail(sheet.id);
  else if(sheet.type==="pair")inner=`<div class="sheet-top"><span class="eyebrow">Karıştırılan kelimeler</span>${closeBtn}</div>${vPairCard(PAIRS[sheet.i],false)}<button class="btn btn-primary" data-act="pairstudy" data-v="${sheet.i}">Mini teste başla</button>`;
  else if(sheet.type==="pairs")inner=`<div class="sheet-top"><h2 style="font-size:20px">Karıştırılan kelimeler</h2>${closeBtn}</div><div class="pairbtns">${PAIRS.map((p,i)=>`<button class="chipbtn" data-act="pair" data-v="${i}">${esc(p.ws.join(" / "))}</button>`).join("")}</div>`;
  else if(sheet.type==="clusters"){
    const gs=Object.keys(GROUPS).filter(g=>g[0]!=="l"&&W.some(w=>w.g===g));
    inner=`<div class="sheet-top"><h2 style="font-size:20px">Eş anlam kümeleri</h2>${closeBtn}</div><p class="small muted">Yakın anlamlı, ancak tamamen interchangeable değiller. Bir anlam merdiveni ya da küme seç.</p>
    <h3 class="eyebrow">Anlam merdivenleri · ${LADDERS.length}</h3>
    <div class="pairbtns">${LADDERS.map(L=>`<button class="chipbtn" data-act="ladderopen" data-v="${esc(L.id)}">${esc(L.title)} <span class="num">${clusterMastery(ladderWords(L)).score}</span></button>`).join("")}</div>
    <h3 class="eyebrow">Anlamsal kümeler</h3>
    <div class="pairbtns">${gs.map(g=>{const n=W.filter(w=>w.g===g).length,k=W.filter(w=>w.g===g&&S.cards[w.id]).length;return`<button class="chipbtn" data-act="cluster" data-v="${g}">${esc(GROUPS[g][0])} <span class="num">${k}/${n}</span></button>`}).join("")}</div>`;
  }else if(sheet.type==="ladder"){const L=LADDERS.find(x=>x.id===sheet.id);inner=`<div class="sheet-top"><span class="eyebrow">Anlam merdiveni</span>${closeBtn}</div>${vSemLadder(L)}<button class="btn btn-primary" data-act="ladderstudy" data-v="${esc(L.id)}">Bu merdiveni çalış</button>`}
  else if(sheet.type==="cluster")inner=`<div class="sheet-top"><span class="eyebrow">Eş anlam kümesi</span>${closeBtn}</div>${vLadder(sheet.g)}<button class="btn btn-primary" data-act="clusterstudy" data-v="${esc(sheet.g)}">Bu kümeyi çalış</button>`;
  else if(sheet.type==="conn"){
    const gs=Object.keys(CONN_FN);
    inner=`<div class="sheet-top"><h2 style="font-size:20px">Bağlaç ustası</h2>${closeBtn}</div><p class="small muted">Her bağlacın anlamı, ardından gelen yapı, cümledeki yeri ve noktalaması. YDS'de en sık tuzak: despite + isim / V-ing ↔ although + özne + yüklem.</p>
    ${gs.map(g=>`<div class="cgroup"><div class="gtitle"><h3>${esc(GROUPS[g][0])}</h3><button class="link" data-act="connstudy" data-v="${g}">çalış</button></div><table class="gtable"><tr><th>Bağlaç</th><th>Yapı</th></tr>${W.filter(w=>w.g===g&&w.cn).map(w=>`<tr><td><button class="link" data-act="detail" data-v="${esc(w.id)}">${esc(w.w)}</button> <span class="muted small">${esc(w.tr.split(" / ")[0])}</span></td><td class="small">${esc(STRUCT_SHORT[w.cn.struct])}</td></tr>`).join("")}</table></div>`).join("")}
    <button class="btn btn-primary" data-act="connstudy">Karışık bağlaç testi</button>`;
  }else if(sheet.type==="mock")inner=`<div class="sheet-top"><h2 style="font-size:20px">Deneme sonucumu ekle</h2>${closeBtn}</div>
    <p class="small muted">İsteğe bağlı. Bu bilgi puan tahmini için kullanılmaz; yalnızca uygulama içi göstergelerin gerçek denemeyle uyumunu görmek için saklanır. Yalnızca toplamı biliyorsan diğer alanları boş bırak.</p>
    <div class="form"><label>Tarih<input type="date" id="mk_d" value="${new Date(today()*86400000).toISOString().slice(0,10)}"></label>
    <label>Toplam doğru (80 soruda)<input type="number" id="mk_t" min="0" max="80" inputmode="numeric"></label>
    <label>Vocabulary %<input type="number" id="mk_v" min="0" max="100" inputmode="numeric"></label><label>Cloze %<input type="number" id="mk_c" min="0" max="100" inputmode="numeric"></label>
    <label>Sentence Completion %<input type="number" id="mk_s" min="0" max="100" inputmode="numeric"></label><label>Reading %<input type="number" id="mk_r" min="0" max="100" inputmode="numeric"></label></div>
    ${sheet.msg?`<p class="msg bad" role="status">${esc(sheet.msg)}</p>`:""}<button class="btn btn-primary" data-act="mocksave">Kaydet</button>`;
  else if(sheet.type==="flag")inner=`<div class="sheet-top"><h2 style="font-size:20px">Bu soruda sorun var</h2>${closeBtn}</div>
    <p class="small muted">Bildirim yalnızca bu cihazda saklanır; açıklama zorunlu değil.</p>
    <div class="opts">${["Birden fazla doğru olabilir","Cümle doğal değil","Çeviri sorunlu","Cevabı anlamadım","Diğer"].map(r=>`<button class="opt" data-act="flagsave" data-v="${esc(r)}"><span>${esc(r)}</span></button>`).join("")}</div>
    <input type="text" id="flagnote" class="search" placeholder="İstersen kısa not (isteğe bağlı)" aria-label="Kısa not">`;
  else if(sheet.type==="report30"){const r=report30(),pc=x=>x==null?"–":"%"+pct(x),ra=x=>x&&x.a!=null?`%${pct(x.a)} (n=${x.n})`:"Insufficient Data";
    inner=`<div class="sheet-top"><h2 style="font-size:20px">30 günlük öğrenme raporu</h2>${closeBtn}</div>
    <div class="sumgrid"><span>Çalışılan gün</span><b>${r.studyDays}</b><span>Toplam çalışma</span><b>${r.studyMin} dk</b><span>Tanıtılan kelime</span><b>${r.introduced}</b><span>Kalıcı olan</span><b>${r.mastered}</b><span>Kalıcıyken unutulan</span><b>${r.forgotten}</b><span>Tamamlanan tekrar</span><b>${r.reviews}</b>
    <span>Bellek doğruluğu</span><b>${pc(r.memory)}</b><span>Aktarım doğruluğu</span><b>${pc(r.transfer)}</b><span>Gecikmeli aktarım</span><b>${ra(r.delayed)}</b>
    <span>Easy / Good / Hard hatırlama</span><b>${ra(r.easy)} · ${ra(r.good)} · ${ra(r.hard)}</b><span>Okuma / Cloze doğruluğu</span><b>${pc(r.reading)} · ${pc(r.cloze)}</b>
    <span>Recognition / Recall gap · Leech</span><b>${r.recog} · ${r.recall} · ${r.leech}</b><span>Tahmin kalibrasyonu</span><b>${esc(r.brier.l)}</b>
    <span>Önerilen günlük yeni kelime</span><b>${r.newRec.ready?r.newRec.rec:"Insufficient Data"}</b><span>Önerilen oturum süresi</span><b>${r.lenRec?esc(r.lenRec):"mevcut süre uygun"}</b></div>
    <h3 class="eyebrow">En güçlü / en zayıf kümeler</h3><p class="small">${r.best.map(x=>esc(GROUPS[x.g][1])+" "+x.score).join(" · ")||"–"}<br>${r.weakest.map(x=>esc(GROUPS[x.g][1])+" "+x.score).join(" · ")||"–"}</p>
    <h3 class="eyebrow">Algoritmada değiştirilmesi önerilenler</h3>${r.changes.length?`<ul class="small">${r.changes.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:`<p class="small muted">Veri, değişiklik gerektirmiyor ya da henüz yeterli değil.</p>`}
    <p class="note">Öneriler otomatik uygulanmaz.</p>`
  }else if(sheet.type==="weekly")inner=`<div class="sheet-top"><h2 style="font-size:20px">Haftalık rapor</h2>${closeBtn}</div>${vWeekly()}`;
  else if(sheet.type==="yds"){
    const last=S.mini.slice(-1)[0];
    inner=`<div class="sheet-top"><h2 style="font-size:20px">Mini YDS</h2>${closeBtn}</div>
    <p class="muted">${BANK.length+RD.length} soruluk banka: Vocabulary, Cloze Test, Sentence Completion, Translation, Restatement, Paragraph Completion ve Reading. Doğru cevaplar A–E arasında dengeli dağılır; test sonunda her soru için öğrenme modu açılır.</p>
    <div class="opts">${[5,10,20,40].map(n=>`<button class="opt" data-act="ydsstart" data-v="${n}"><span class="k">${n}</span><span>${n} soru · yaklaşık ${Math.round(n*1.3)} dk</span></button>`).join("")}</div>
    ${last?`<p class="note">Son test: ${last.c}/${last.n} doğru.</p>`:""}`;
  }else if(sheet.type==="export"){
    inner=`<div class="sheet-top"><h2 style="font-size:20px">Yedeği kopyala</h2>${closeBtn}</div>
    <p class="muted small">${sheet.auto?"Otomatik kopyalama bu tarayıcıda çalışmadı. Metin seçildi; kopyala komutunu kullan.":"Bu metni kopyalayıp güvenli bir yere (not, e-posta) kaydet."} Başka cihazda “Yedeği yapıştır” ile yükleyebilirsin.</p>
    <textarea id="exportbox" readonly aria-label="Yedek metni">${esc(exportText())}</textarea>
    <button class="btn btn-primary" data-act="copybox">Kopyala</button>`;
  }else if(sheet.type==="import"){
    inner=`<div class="sheet-top"><h2 style="font-size:20px">Yedeği yapıştır</h2>${closeBtn}</div>
    <p class="muted small">Kopyaladığın yedek metnini yapıştır ya da kaydettiğin .json dosyasını seç. Önce kontrol edilir; hatalı yedek mevcut verine dokunmaz.</p>
    <textarea id="importbox" aria-label="Yedek metni" placeholder='{"app":"YDS Kelime Atölyesi", ...}'>${esc(sheet.text||"")}</textarea>
    <input type="file" id="importfile" accept=".json,application/json,text/plain" aria-label="Dosya seç">
    ${sheet.msg?`<p class="msg ${sheet.ok?"ok":"bad"}" role="status">${esc(sheet.msg)}</p>`:""}
    ${sheet.undo?`<button class="btn btn-ghost" data-act="undoimport">İçe aktarmayı geri al</button>`:""}
    ${sheet.pending?`<p class="small">${esc(sheet.pending.summary)}</p><div class="btn-row"><button class="btn btn-ghost" data-act="close">Vazgeç</button><button class="btn btn-danger" data-act="importconfirm">Yerine geçir</button></div>`:sheet.undo?"":`<button class="btn btn-primary" data-act="importcheck">Kontrol et</button>`}`;
  }else if(sheet.type==="confirm"){
    const m={exit:["Oturumdan çıkılsın mı?","Şimdiye kadar puanladığın kelimeler ve cevapların kaydedildi. Kalan adımlar bugünkü listede bekler.","Çık","btn-primary"],reset:["Tüm ilerleme silinsin mi?","Öğrenilen kelimeler, tekrar programı, favoriler ve istatistikler bu tarayıcıdan silinir. Önce yedeği kopyalamanı öneririz. Bu işlem geri alınamaz.","Sıfırla","btn-danger"]}[sheet.what];
    inner=`<h2 style="font-size:20px">${m[0]}</h2><p class="muted">${m[1]}</p><div class="btn-row"><button class="btn btn-ghost" data-act="close">Vazgeç</button><button class="btn ${m[3]}" data-act="confirm">${m[2]}</button></div>`;
  }
  return`<div class="sheet-back" data-act="backdrop"><div class="sheet" role="dialog" aria-modal="true">${inner}</div></div>`;
}

