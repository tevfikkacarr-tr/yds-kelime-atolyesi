/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
function vRealCal(){
  const RC=realCalibration(),T=calibReport(),q=quadrants(),pc=x=>x==null?"–":"%"+pct(x);
  const row=(l,x)=>`<span>${l}</span><b>${aOf(x)}${nOf(x)}</b>`;
  const gap=(r,b)=>{const g=gapRate(r+":"+b);return`<td class="r">${g.n?`%${pct(g.a)}<br><span class="muted small">n=${g.n}</span>`:`<span class="muted small">n=0</span>`}</td>`};
  const rtb=["<3","3–7","7–15","15–30"].map(b=>{const x=S.rtNext[b];return`<tr><td>${b} sn</td><td class="r">${x&&x.c+x.w?"%"+pct(x.c/(x.c+x.w)):"–"}</td><td class="r">${x?x.c+x.w:0}</td></tr>`}).join("");
  const lee=taggedIds("Leech").map(id=>({id,r:leechReason(id)}));
  const mc=["7","30","60","90"].map(k=>{const x=S.mastCheck[k];return`<span>${k}. gün kontrolü</span><b>${x&&x.c+x.w?"%"+pct(x.c/(x.c+x.w)):"–"} <span class="muted small">n=${x?x.c+x.w:0}</span></b>`}).join("");
  const G=S.gapStats,lr=S.leechRec;
  const mock=S.mocks[S.mocks.length-1],Rd=readiness(),byR={};Rd.forEach(x=>byR[x.k]=x.v);
  const mm=(lab,key,v)=>{if(v==null)return"";const r=byR[key],warn=(r==="Strong"&&v<60)||(r==="Limited"&&v>80);return`<tr><td>${lab}</td><td>${r}</td><td class="r">%${v}</td><td>${warn?"⚠ uyumsuz":"✓"}</td></tr>`};
  const rec=recommendedChanges();
  const wp=Object.entries(S.wrongPicks).filter(([k,x])=>x.rep>=1);
  return`<section class="panel"><h2>REAL USER CALIBRATION</h2>
  <p class="small"><b>Calibration Day: ${RC.calDay}/30</b> · ${RC.status}${S.calStart!=null?` · başlangıç ${new Date(S.calStart*86400000).toLocaleDateString("tr-TR",{timeZone:"UTC"})}`:""}</p>
  <div class="sumgrid"><span>Study Days</span><b>${RC.studyDays}</b><span>Sessions Completed</span><b>${RC.sessions}</b><span>Total Reviews</span><b>${RC.reviews}</b><span>Unique Words Reviewed</span><b>${RC.unique}</b><span>New Words Learned</span><b>${RC.newWords}</b>
  <span>Recall Predictions (ort.)</span><b>${pc(RC.predicted)}</b><span>Actual Recall</span><b>${pc(RC.actual)}</b><span>Brier Score</span><b>${RC.brier.b==null?"–":RC.brier.b.toFixed(3)} · ${esc(RC.brier.l)}</b>
  ${row("Easy Recall",RC.easy)}${row("Good Recall",RC.good)}${row("Hard Recall",RC.hard)}${row("Hard 1-day",RC.hard1)}${row("Hard 3-day",RC.hard3)}${row("Hard 7-day",RC.hard7)}
  <span>Recognition Gaps</span><b>${RC.recog}</b><span>Recall Gaps</span><b>${RC.recall}</b><span>Leech Words</span><b>${RC.leech}</b><span>Fragile Mastered</span><b>${RC.fragile}</b><span>Forgotten Mastered</span><b>${RC.forgotten}</b>
  ${row("Reading Transfer",RC.readT)}${row("Cloze Transfer",RC.clzT)}${row("Mini YDS Vocabulary Transfer",RC.yvT)}${row("Immediate Transfer",RC.immediate)}${row("Delayed Transfer (3–7 gün)",RC.delayed)}
  <span>Average Session Duration</span><b>${RC.avgSecs==null?"–":Math.round(RC.avgSecs/60)+" dk"}</b><span>Completion Rate</span><b>${pc(RC.completion)}</b>
  <span>Storage Usage</span><b>${(RC.chars/1048576).toFixed(2)} M karakter · events ${RC.events} · aggregated ${RC.agg} gün</b></div>
  <h3 class="eyebrow">Recall calibration</h3><div class="tablewrap"><table class="gtable"><tr><th>Prediction</th><th class="r">Avg pred.</th><th class="r">Actual</th><th class="r">Samples</th><th class="r">Diff</th><th>Durum</th></tr>
  ${T.map(b=>`<tr><td>%${b.range}</td><td class="r">${pc(b.pred)}</td><td class="r">${pc(b.real)}</td><td class="r">n = ${b.n}</td><td class="r">${b.n?((b.real-b.pred)>=0?"+":"")+pct(b.real-b.pred)+"%":"–"}</td><td>${b.n<20?"yetersiz":Math.abs(b.real-b.pred)<=.1?"kalibre":"sapma"}</td></tr>`).join("")}</table></div>
  <h3 class="eyebrow">Puan sonrası gerçek hatırlama</h3><div class="tablewrap"><table class="gtable"><tr><th>Puan</th><th class="r">1 gün</th><th class="r">3 gün</th><th class="r">7 gün</th><th class="r">14 gün</th></tr>
  <tr><td>Easy</td>${gap("easy",1)}${gap("easy",3)}${gap("easy",7)}${gap("easy",14)}</tr><tr><td>Good</td>${gap("good",1)}${gap("good",3)}${gap("good",7)}${gap("good",14)}</tr><tr><td>Hard</td>${gap("hard",1)}${gap("hard",3)}${gap("hard",7)}<td class="r">–</td></tr></table></div>
  <h3 class="eyebrow">Çarpan değişiklik kaydı</h3><p class="small">${S.schedLog.length?S.schedLog.slice(-8).map(x=>`${new Date(x.t*86400000).toLocaleDateString("tr-TR",{timeZone:"UTC"})} · ${x.key}: ${x.from} → ${x.to} · gerçek %${pct(x.rate)} · hedef ${x.target||"–"} · n=${x.n} · ${x.reason||""}`).join("<br>"):"Değişiklik yok. Her puan türü için en az 20 geçerli gözlem; aynı çarpan 3 günden sık değişmez; adım ±%5; sınırlar Easy 0,80–1,30 · Good 0,80–1,25 · Hard 0,70–1,15."}</p>
  <h3 class="eyebrow">Tepki süresi → sonraki hatırlama</h3><div class="tablewrap"><table class="gtable"><tr><th>Doğru cevap süresi</th><th class="r">Sonraki hatırlama</th><th class="r">n</th></tr>${rtb}</table></div>
  <h3 class="eyebrow">Müdahale doğrulaması (14 gün sonra)</h3><p class="small">Recognition Gap: ${G.RG.n?`%${pct(G.RG.resolved/G.RG.n)} etiketten çıktı`:"Insufficient Data"} <span class="muted">n=${G.RG.n}</span><br>Recall Gap: ${G.RC.m?`doğrudan hatırlama %${pct(G.RC.before/G.RC.m)} → %${pct(G.RC.after/G.RC.m)}`:"Insufficient Data"} <span class="muted">n=${G.RC.m||0}</span> · etiketten çıkan ${G.RC.n?"%"+pct(G.RC.resolved/G.RC.n):"–"}</p>
  <h3 class="eyebrow">Leech</h3><p class="small">${lee.length?lee.slice(0,15).map(x=>`${esc(x.id)} — ${esc(x.r.tr)} <span class="muted">(${esc(x.r.r)}${x.r.d?": "+esc(x.r.d):""})</span>`).join("<br>"):"Leech yok."}<br>Özel kart sonrası: 1 gün ${rateOf(lr.d1).n?"%"+pct(rateOf(lr.d1).a):"–"} (n=${lr.d1.n}) · 3 gün ${rateOf(lr.d3).n?"%"+pct(rateOf(lr.d3).a):"–"} (n=${lr.d3.n}) · 7 gün ${rateOf(lr.d7).n?"%"+pct(rateOf(lr.d7).a):"–"} (n=${lr.d7.n}) · dinlenmeye alınan: ${S.leechRest}</p>
  <h3 class="eyebrow">Kalıcı kontrolleri</h3><div class="sumgrid">${mc}</div>
  <h3 class="eyebrow">Memory vs Transfer</h3><div class="sumgrid"><span>A · bellek yüksek, aktarım yüksek</span><b>${q.A}</b><span><b>B · bellek yüksek, aktarım düşük ⚠</b></span><b>${q.B}</b><span>C · bellek düşük, aktarım yüksek</span><b>${q.C}</b><span>D · ikisi de düşük</span><b>${q.D}</b><span>Aktarım verisi yok</span><b>${q.none}</b></div>
  ${S.quadHist.length>1?`<p class="small muted">Değişim: ${S.quadHist.slice(-7).map(x=>`${new Date(x.d*86400000).toLocaleDateString("tr-TR",{day:"numeric",month:"numeric",timeZone:"UTC"})} B=${x.B}`).join(" · ")}</p>`:""}
  ${q.B_ids.length?`<p class="small">B grubu (bağlam/okuma/cloze ile çalışılıyor): ${q.B_ids.slice(0,15).map(esc).join(", ")}</p>`:""}
  <h3 class="eyebrow">Readiness vs Mock Exam</h3>${mock?`<div class="tablewrap"><table class="gtable"><tr><th>Beceri</th><th>Uygulama</th><th class="r">Deneme</th><th></th></tr>${mm("Vocabulary","Vocabulary Readiness",mock.vocab)}${mm("Cloze","Cloze",mock.cloze)}${mm("Sentence Completion","Context",mock.sc)}${mm("Reading","Reading Transfer",mock.reading)}${mm("Toplam","Vocabulary Readiness",Math.round(mock.total/80*100))}</table></div>`:`<p class="small muted">Henüz deneme sonucu girilmedi.</p>`}
  <h3 class="eyebrow">Recommended Calibration Changes</h3>${RC.calDay<30?`<p class="small muted">30 çalışma günü dolmadan öneriler kesin değildir (şu an ${RC.calDay}/30).</p>`:""}${rec.length?`<ul class="small">${rec.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:`<p class="small muted">Yeterli veri yok; değişiklik önerilmiyor. scheduler-v2 korunur.</p>`}
  <p class="small muted">Öneriler otomatik uygulanmaz; onaydan sonra gerekiyorsa scheduler-v3 oluşturulur.</p>
  <h3 class="eyebrow">Soru kalitesi sinyalleri</h3><p class="small">Kullanıcı bildirimleri: ${S.flags.length?S.flags.slice(-10).map(f=>`${esc(f.q)} — ${esc(f.reason)}`).join("<br>"):"yok"}<br>Aynı yanlış seçeneğin tekrar seçildiği sorular: ${wp.length?wp.slice(0,10).map(([k,x])=>`${esc(k)} → “${esc(x.pick)}” (${x.rep+1}×)`).join("<br>"):"yok"}</p>
  <h3 class="eyebrow">Mini YDS eğilimi</h3>${(()=>{const mt=miniTrend();return mt?`<p class="small">${Object.keys(mt).filter(k=>Object.values(mt[k]).some(v=>v!=null)).map(k=>`${YT[k]}: ${[5,10,20].map(N=>mt[k][N]==null?"–":"%"+pct(mt[k][N])).join(" / ")}`).join("<br>")}</p>`:`<p class="small muted">En az 5 test gerekir (şu an ${S.mini.length}).</p>`})()}
  <h3 class="eyebrow">Performans kaydı</h3><p class="small">${S.perfLog.length?S.perfLog.map(x=>`Gün ${x.m}: ${(x.chars/1048576).toFixed(2)} M karakter · events ${x.events} · aggregated ${x.agg} · render ${x.renderMs} ms`).join("<br>"):"Henüz kayıt yok (1, 14, 30, 60, 90. çalışma günlerinde alınır)."}</p></section>`;
}
function vCalib(){
  const D=calibDashboard(),pc=x=>x==null?"–":"%"+pct(x);
  const hb=k=>D.hard[k].n?`%${pct(D.hard[k].ok/D.hard[k].n)} (${D.hard[k].n})`:"–";
  return`<section class="panel"><h2>Calibration Dashboard</h2>
  <p class="small ${D.ready?"":"muted"}">Gerçek kullanım verisi: ${D.days}/14 çalışma günü${D.ready?" — kalibrasyon yorumlanabilir.":" — büyük algoritma değişikliğinden önce en az 14 gün veri biriktirilmeli."} Algoritma: ${esc(D.alg)}${D.algHistory.length?` (önceki: ${D.algHistory.map(x=>esc(x.v)).join(", ")})`:""}</p>
  <div class="sumgrid"><span>Toplam tekrar</span><b>${D.reviews}</b><span>Tahmin hatası (Brier)</span><b>${D.brier==null?"–":D.brier.toFixed(3)}</b><span>Ortalama tepki süresi</span><b>${D.rt==null?"–":(D.rt/1000).toFixed(1)+" sn"}</b><span>Elenen uç süreler</span><b>${D.rtDropped}</b>
  <span>Hard 1 / 3 / 7 gün</span><b>${hb("d1")} · ${hb("d3")} · ${hb("d7")}</b><span>Easy sonrası hatırlama</span><b>${pc(D.easy)} (${D.tot.easy.n})</b><span>Good sonrası hatırlama</span><b>${pc(D.good)} (${D.tot.good.n})</b><span>Hard sonrası hatırlama</span><b>${pc(D.hardR)} (${D.tot.hard.n})</b>
  <span>Çarpanlar</span><b>E ×${D.spacing.easy.toFixed(2)} · G ×${D.spacing.good.toFixed(2)} · H ×${D.spacing.hard.toFixed(2)}</b><span>3–7 gün okuma aktarımı</span><b>${D.transfer37.n?`%${pct(D.transfer37.ok/D.transfer37.n)} (${D.transfer37.n})`:"–"}</b>
  <span>Kırılgan kalıcı kontrol</span><b>${D.fragileStats.n?`%${pct(D.fragileStats.ok/D.fragileStats.n)} (${D.fragileStats.n})`:"–"}</b><span>Sürpriz kontrol</span><b>${D.surprise.n?`%${pct(D.surprise.ok/D.surprise.n)} (${D.surprise.n})`:"–"}</b></div>
  <h3 class="eyebrow">Tahmin kalibrasyonu (recallProbability)</h3>
  <div class="tablewrap"><table class="gtable"><tr><th>Tahmin</th><th class="r">n</th><th class="r">Ort. tahmin</th><th class="r">Gerçek</th></tr>${D.calib.map(b=>`<tr><td>%${b.range}</td><td class="r">${b.n}</td><td class="r">${pc(b.pred)}</td><td class="r">${pc(b.real)}</td></tr>`).join("")}</table></div>
  <h3 class="eyebrow">Zamanlayıcı ayarları</h3><p class="small">${D.log.length?D.log.slice(-5).map(x=>`${x.key}: ×${x.from} → ×${x.to} (hatırlama %${pct(x.rate)}, n=${x.n})`).join("<br>"):"Henüz değişiklik yok (en az 20 örnek gerekir)."}</p>
  <p class="small">Leech: ${D.leech.length?D.leech.slice(0,12).map(esc).join(", "):"–"}<br>Recognition gap: ${D.recog.length?D.recog.slice(0,12).map(esc).join(", "):"–"}<br>Recall gap: ${D.recall.length?D.recall.slice(0,12).map(esc).join(", "):"–"}<br>Kırılgan kalıcı: ${D.fragile.length}<br>Kişisel karıştırma çiftleri: ${D.pairs.length?D.pairs.slice(0,8).map(p=>esc(p.ws.join("↔"))+" ("+p.n+")").join(", "):"–"}</p>
  <h3 class="eyebrow">Depolama</h3><p class="small">Tahmini kullanım: ${Math.round(D.chars/1024)} K karakter (~%${Math.round(100*D.chars/STORAGE_BUDGET)} / 5 M) · ayrıntılı olay: ${D.events} · özetlenmiş gün: ${D.agg}. 3,5 M karakterin üzerinde 30 günden eski olaylar, 4,2 M üzerinde 7 günden eskiler özetlenir; öğrenme durumu korunur.</p></section>`;
}
/* Ayarlar: tercih, yedek, kurulum ve cihaz bilgisi */
function vSettings(){
  const segN=n=>`<button data-act="npd" data-v="${n}" aria-pressed="${S.settings.newPerDay===n}">${n}</button>`;
  const segT=(k,l)=>`<button data-act="theme" data-v="${k}" aria-pressed="${S.settings.theme===k}">${l}</button>`;
  const segR=(k,l)=>`<button data-act="recall" data-v="${k}" aria-pressed="${S.settings.recall===k}">${l}</button>`;
  const seg2=(k,l)=>`<button data-act="len" data-v="${k}" aria-pressed="${S.settings.length===k}">${l}</button>`;
  const I=typeof window!=="undefined"&&window.__ydsInstall,sg=suggestNewPerDay();
  const inst=!I?"":I.standalone()?`<p class="small">Uygulama bu cihaza eklenmiş olarak çalışıyor.</p>`:I.canPrompt()?`<button class="btn btn-ghost btn-sm" data-act="install">Uygulamayı telefona ekle</button>`:I.ios()?`<p class="small">iPhone / iPad: Safari'de <b>Paylaş</b> düğmesine dokun → <b>Ana Ekrana Ekle</b>.</p>`:`<p class="small">Tarayıcı menüsünden <b>Ana ekrana ekle</b> / <b>Uygulamayı yükle</b> seçeneğini kullanabilirsin.</p>`;
  return`<div class="stack">
  <div><div class="eyebrow">Ayarlar</div><h1 class="sumhead" style="font-size:27px">Ayarlar ve yedek</h1></div>
  <section class="panel"><h2>Çalışma</h2>
    <div class="setrow"><span>Günlük yeni kelime (Normal süre)</span><span class="seg">${segN(5)}${segN(10)}${segN(15)}${segN(20)}${[5,10,15,20].includes(S.settings.newPerDay)?"":segN(S.settings.newPerDay)}</span></div>
    ${sg.ready?`<p class="tip">${esc(sg.text)}${sg.rec!==sg.cur?` <button class="link" data-act="npd" data-v="${sg.rec}">Öneriyi uygula (${sg.rec})</button>`:""}</p>`:""}
    <div class="setrow"><span>Oturum süresi</span><span class="seg">${seg2("quick","10 dk")}${seg2("normal","20 dk")}${seg2("deep","30 dk")}</span></div>
    <div class="setrow"><span>Hatırlama biçimi</span><span class="seg">${segR("auto","Otomatik")}${segR("buttons","Butonlu")}${segR("open","Açık hatırlama")}</span></div>
    <p class="note">Açık hatırlama: anlamı zihninden söyler, sonra cevabı açarsın. Otomatik: oturmuş tekrarlarda açık hatırlama, yeni kelimelerde butonlar.</p>
    <div class="setrow"><span>Görünüm</span><span class="seg">${segT("system","Sistem")}${segT("light","Açık")}${segT("dark","Koyu")}</span></div>
  </section>
  <section class="panel"><h2>Yedekle</h2>
    <p class="small">İlerlemen bu cihazdaki tarayıcıda saklanır. Tarayıcı verileri silinmeden önce yedek almanı öneririz.</p>
    <div class="btn-row"><button class="btn btn-primary btn-sm" data-act="copybackup">Yedeği Kopyala</button><button class="btn btn-ghost btn-sm" data-act="import">Yedeği İçe Aktar</button></div>
    <button class="link" data-act="export">Yedeği Metin Olarak Göster</button>
    <p class="note" id="backupmsg" role="status"></p>
    ${SAVE_ERROR?`<p class="msg bad" role="alert">Son değişiklik kaydedilemedi (tarayıcı depolama alanı dolu olabilir). Lütfen hemen yedek al.</p>`:""}
    <p class="small muted">Çalışma ilerlemen bu cihaz ve tarayıcıda saklanır. Telefon ve bilgisayar birbirinden bağımsızdır; birinden diğerine geçmek için yedeği kopyalayıp diğer cihazda içe aktar.</p>
  </section>
  <section class="panel"><h2>Uygulama</h2>${inst}
    <div class="setrow"><span class="muted small">Veri sürümü v${S.dataVersion} · ${ALG}</span><button class="link" data-act="reset">İlerlemeyi sıfırla</button></div></section>
  </div>`;
}
function vDebug(){
  const r=validateContent();
  return`<section class="panel"><h2>İçerik doğrulama (debug)</h2><p class="small">${r.passed}/${r.words} kelime geçti · ${r.errors.length} sorun · soru bankası ${r.bank}</p>
  ${r.errors.length?`<ul class="small">${Object.entries(r.byType).map(([k,n])=>`<li>${esc(k)}: ${n}</li>`).join("")}</ul>`:""}<p class="note">Ayrıntı için konsolda ydsValidate() çalıştır.</p></section>
  ${vRealCal()}
  ${vCalib()}
  <section class="panel"><h2>Gerçek cihaz kontrol listesi</h2><p class="small muted">Cihazlar: iPhone Safari · Android Chrome · Desktop Chrome · Desktop Firefox</p>
  <ul class="chk">${DEVICE_CHECKS.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></section>`;
}

function vAdvanced(id){
  const c=S.cards[id],t=today(),tf=transferScore(id),tags=wordTags(id),last={e:"Easy",g:"Good",h:"Hard",a:"Again"}[c.rat[c.rat.length-1]]||"–";
  const ex=c.reps+c.correct+c.wrong,okN=c.correct+c.rat.filter(x=>x==="g"||x==="e").length;
  const tI=c.trI&&c.trI.c+c.trI.w,tD=c.trD&&c.trD.c+c.trD.w;
  return`<details class="adv"><summary class="small">Gelişmiş ayrıntılar</summary><div class="sumgrid small">
  <span>Exposures</span><b>${ex}</b><span>Correct Recall</span><b>${okN}</b><span>Incorrect</span><b>${ex-okN}</b><span>Current Mastery</span><b>${masteryScore(id,t)}</b>
  <span>Transfer</span><b>${tf?tf.score:"–"}</b><span>Predicted Recall Today</span><b>%${pct(recallProbability(id,t))}</b><span>Last Rating</span><b>${last}</b><span>Next Review</span><b>${c.due<=t?"bugün":(c.due-t)+" gün"}</b>
  <span>Recognition Gap</span><b>${tags.has("RecognitionGap")?"Yes":"No"}</b><span>Recall Gap</span><b>${tags.has("RecallGap")?"Yes":"No"}</b>
  <span>Immediate Transfer</span><b>${tI?`%${pct(c.trI.c/tI)} (n=${tI})`:"–"}</b><span>Delayed Transfer</span><b>${tD?`%${pct(c.trD.c/tD)} (n=${tD})`:"–"}</b>
  ${tags.has("Leech")?`<span>Leech nedeni</span><b>${esc(leechReason(id).tr)}</b>`:""}${c.restUntil>t?`<span>Dinlenme</span><b>${c.restUntil-t} gün</b>`:""}</div></details>`;
}
