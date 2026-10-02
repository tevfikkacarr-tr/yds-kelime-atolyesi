/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
function stats(){
  const sm=statusMap();const st={new:0,learning:0,familiar:0,weak:0,mastered:0};
  W.forEach(w=>st[sm[w.id]]++);
  const credit={mastered:1,familiar:.6,learning:.3,weak:.2,new:0};
  const cov=l=>{const ws=W.filter(w=>w.l===l);return ws.length?ws.reduce((a,w)=>a+credit[sm[w.id]],0)/ws.length:0};
  const lv={};for(let l=1;l<=5;l++)lv[l]=cov(l);
  const stage=lv[1]<.3?"Başlangıç (Foundation)":lv[1]<.7?"Temel (Core YDS)":lv[2]<.5?"Sık akademik (High Frequency)":lv[3]<.5?"Orta (Intermediate YDS)":lv[4]<.4?"İleri (Advanced YDS)":"Yüksek puan (High Score)";
  return{st,lv,stage,due:dueList().length};
}
function vWeekly(){
  const r=weeklyReport();const a=r.a;
  const d=(x,y)=>y==null||x==null?"":` <span class="muted small">(${x>=y?"+":""}${pct(x-y)} puan)</span>`;
  const wins=weeklyWins();
  return`${wins.length?`<div class="wins"><h3>Bu hafta kazandıkların</h3><ul>${wins.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`:""}<div class="sumgrid"><span>Yeni kelime</span><b>${a.n}</b><span>Tekrar</span><b>${a.r}</b><span>Cevaplanan soru</span><b>${a.q}</b><span>Doğruluk</span><b>${r.acc==null?"–":"%"+pct(r.acc)}</b><span>Bu hafta kalıcı olan</span><b>${a.m}</b><span>Toplam kalıcı</span><b>${r.mastered}</b><span>Çalışılan gün</span><b>${a.days} / 7</b></div>
  ${r.acc!=null&&r.accPrev!=null?`<p class="small">Geçen haftaya göre doğruluk${d(r.acc,r.accPrev)}</p>`:""}
  <div class="areas"><div class="area"><span>En güçlü küme</span><b>${r.strongest?`${esc(GROUPS[r.strongest.g][1])} <span class="muted small">%${pct(r.strongest.a)}</span>`:"Veri yok"}</b></div>
  <div class="area"><span>En çok gelişen alan</span><b>${r.improved?`${SKILLS[r.improved.k]} <span class="muted small">+${pct(r.improved.d)}</span>`:"Veri yok"}</b></div>
  <div class="area"><span>Çalışılması gereken</span><b>${r.weakG?`${esc(GROUPS[r.weakG.g][1])} <span class="muted small">%${pct(r.weakG.a)}</span>`:r.needs?`${SKILLS[r.needs.k]} <span class="muted small">%${pct(r.needs.a)}</span>`:"Veri yok"}</b></div>
  <div class="area"><span>Gelecek haftanın odağı</span><b class="small">${esc(r.focus)}</b></div></div>
  ${(()=>{const wp=weeklyPlan(r);return`<div class="wplan"><h3>Bu hafta ne çalışmalısın?</h3><ol>${wp.areas.map(a=>`<li>${esc(a)}</li>`).join("")}</ol>
  ${wp.words.length?`<div class="eyebrow">Önerilen kelimeler</div><div class="chips">${wp.words.map(id=>`<button class="chipbtn" data-act="detail" data-v="${esc(id)}">${esc(id)}</button>`).join("")}</div>`:""}</div>`})()}`;
}
const SKILL_ROWS=[["Vocabulary","Vocabulary Readiness","Kelime"],["Context","Context","Bağlam"],["Reading","Reading Transfer","Okuma"],["Cloze","Cloze","Cloze"],["Connectors","Connectors","Bağlaçlar"]];
function vReady(){
  const R=readiness(),TR={Strong:"Güçlü",Developing:"Gelişiyor",Limited:"Sınırlı","Veri yetersiz":"Veri yetersiz"},by={};R.forEach(x=>by[x.k]=x);
  const cs=completionStats(),sg=suggestNewPerDay();
  return`<section class="panel"><h2>YDS becerileri</h2>
  <div class="sumgrid">${SKILL_ROWS.map(([en,k,tr])=>`<span>${tr} <span class="muted small">· ${en}</span></span><b>${TR[by[k].v]}</b>`).join("")}</div>
  <p class="note">Yalnızca uygulama içindeki performansını gösterir; YDS puanı tahmini değildir. Gerçek sınav performansı dil bilgisi, zaman yönetimi, okuma ve soru stratejisine de bağlıdır.</p>
  ${S.mocks.length?`<p class="small">Son deneme (${new Date(S.mocks[S.mocks.length-1].d*86400000).toLocaleDateString("tr-TR",{day:"numeric",month:"short",timeZone:"UTC"})}): ${S.mocks[S.mocks.length-1].total}/80 doğru</p>`:""}
  <button class="btn btn-ghost btn-sm" data-act="mockopen">Deneme sonucumu ekle</button>
  ${calDay()>=30?`<button class="btn btn-ghost btn-sm" data-act="report30">30 günlük öğrenme raporu</button>`:""}
  ${cs.tip?`<p class="tip">${esc(cs.tip)}</p>`:""}
  ${sg.ready?`<p class="tip">${esc(sg.text)}${sg.rec!==sg.cur?` <button class="link" data-act="npd" data-v="${sg.rec}">Öneriyi uygula (${sg.rec})</button>`:""}</p>`:`<p class="small muted">Kişisel yeni kelime önerisi ${sg.days}/14 çalışma günü ve ${sg.sess}/10 oturumdan sonra hazırlanır.</p>`}</section>`;
}
function pctOr(x){return x==null?"–":"%"+pct(x)}
function vMonth(){
  const m=monthStats(),dist=m.dist,tot=W.length;
  const colors={new:"var(--line)",learning:"var(--accent)",familiar:"var(--fam)",weak:"var(--warn)",mastered:"var(--good)"};
  return`<section class="panel"><h2>Son 30 gün <small>· Last 30 Days</small></h2>
  <div class="sumgrid"><span>Çalışılan gün</span><b>${m.days} / 30</b><span>Yeni kelime</span><b>${m.n}</b><span>Kalıcı olan</span><b>${m.m}</b><span>Unutulan kalıcı</span><b>${m.fm}</b>
  <span>Ortalama doğruluk</span><b>${pctOr(m.acc)}</b><span>Bağlam doğruluğu</span><b>${pctOr(m.ctx)}</b><span>Eş anlam doğruluğu</span><b>${pctOr(m.syn)}</b><span>Okuma doğruluğu</span><b>${pctOr(m.read)}</b></div>
  <h3 class="eyebrow">Ustalık dağılımı</h3><div class="stackbar" aria-hidden="true">${Object.keys(colors).map(k=>`<i style="width:${dist[k]/tot*100}%;background:${colors[k]}"></i>`).join("")}</div>
  <div class="legend">${Object.keys(colors).map(k=>`<span style="--c:${colors[k]}">${STATUS[k]} %${Math.round(dist[k]/tot*100)}</span>`).join("")}</div></section>`;
}
/* Koç paneli: öz değerlendirme kalibrasyonu, Hard analizi, kişisel aralıklar, küme ve bağlaç ustalığı */
function vCoach(){
  const v=S.self.verify,kc=S.self.knowCtx,H=S.hardStats,sp=S.spacing;
  const hb=k=>H[k].n?`%${pct(H[k].ok/H[k].n)} <span class="muted small">(${H[k].n})</span>`:"–";
  const gs=Object.keys(GROUPS).map(g=>({g,...groupMastery(g)})).filter(x=>x.seen>=3).sort((a,b)=>b.score-a.score);
  const cd=Object.keys(CM_LABEL).map(k=>{const x=S.connDim[k];return{k,a:accOf(x),n:x?x.c+x.w:0}});
  const gl=x=>`<button class="chipbtn" data-act="cluster" data-v="${x.g}">${esc(GROUPS[x.g][1])} <span class="num">${x.score}</span></button>`;
  return`<section class="panel"><h2>Kelime koçu</h2>
  <h3 class="eyebrow">Kendini değerlendirme</h3>
  ${v.n?`<p class="small">Bildiğini düşündüğün kelimelerin %${pct(v.ok/v.n)}'ini sonraki soruda doğru tanıyorsun.${kc.n?` Bağlam sorularında bu oran %${pct(kc.ok/kc.n)}.`:""}</p>`:`<p class="small muted">Birkaç oturumdan sonra “Biliyorum” dediğin kelimelerin sonraki sorularda ne kadar doğrulandığı burada görünür.</p>`}
  ${gs.length?`<h3 class="eyebrow">Küme ustalığı</h3><div class="chips">${gs.slice(0,3).map(gl).join("")}</div>${gs.length>3?`<p class="small muted">Geliştirilecek kümeler:</p><div class="chips">${gs.slice(-3).reverse().map(gl).join("")}</div>`:""}`:""}
  </section>`;
}
function vProgress(){
  const s=stats(),t=today(),mem=memoryStats();
  const row=(l,v,cls,n)=>`<div class="brow"><span>${l}${n!=null?` <span class="muted small">(${n})</span>`:""}</span><span class="num">%${pct(v)}</span><div class="bar${cls?" "+cls:""}"><i style="width:${pct(v)}%"></i></div></div>`;
  const colors={new:"var(--line)",learning:"var(--accent)",familiar:"var(--fam)",weak:"var(--warn)",mastered:"var(--good)"};
  const stack=Object.keys(colors).map(k=>`<i style="width:${s.st[k]/W.length*100}%;background:${colors[k]}"></i>`).join("");
  const legend=Object.keys(colors).map(k=>`<span style="--c:${colors[k]}">${STATUS[k]} ${s.st[k]}</span>`).join("");
  const skills=Object.keys(SKILLS).map(k=>{const x=S.err[k],n=x.c+x.w;return n?row(`${SKILL_EN[k]} · ${SKILLS[k]}`,x.c/n,"g",n):""}).join("");
  const gr=Object.keys(S.grp).filter(g=>GROUPS[g]&&S.grp[g].c+S.grp[g].w>0).sort((a,b)=>(S.grp[b].c+S.grp[b].w)-(S.grp[a].c+S.grp[a].w)).slice(0,12)
    .map(g=>{const x=S.grp[g],n=x.c+x.w;return`<tr><td>${esc(GROUPS[g][1])} <span class="muted small">${esc(GROUPS[g][0])}</span></td><td class="r">${n}</td><td class="r">%${pct(x.c/n)}</td></tr>`}).join("");
  const days=[];for(let i=6;i>=0;i--){const d=t-i,x=S.days[d],dt=new Date(d*86400000);const n=x?((x.n||0)+(x.r||0)||x.q||0):0;days.push(`<div class="day"><i class="${x?"on":""}">${x?n:""}</i>${dt.toLocaleDateString("tr-TR",{weekday:"short",timeZone:"UTC"})}</div>`)}
  const weak=weakList();
  const confs=[];for(const a in S.conf)for(const b in S.conf[a])confs.push([a,b,S.conf[a][b]]);confs.sort((x,y)=>y[2]-x[2]);
  const ins=insights().map(i=>`<li class="${i.w?"warn":""}">${i.t}</li>`).join("");
  const mini=S.mini.slice(-6).reverse().map(m=>`<tr><td>${new Date(m.d*86400000).toLocaleDateString("tr-TR",{day:"numeric",month:"short",timeZone:"UTC"})}</td><td class="r">${m.n}</td><td class="r">${pct(m.c/m.n)}</td><td class="r">${Math.floor(m.secs/60)}:${String(m.secs%60).padStart(2,"0")}</td></tr>`).join("");
  const segN=n=>`<button data-act="npd" data-v="${n}" aria-pressed="${S.settings.newPerDay===n}">${n}</button>`;
  const segT=(k,l)=>`<button data-act="theme" data-v="${k}" aria-pressed="${S.settings.theme===k}">${l}</button>`;
  const segR=(k,l)=>`<button data-act="recall" data-v="${k}" aria-pressed="${S.settings.recall===k}">${l}</button>`;
  const debug=typeof location!=="undefined"&&location.hash==="#debug";
  return`<div class="stack">
  <div><div class="eyebrow">İlerleme</div><h1 class="sumhead" style="font-size:27px">Kişisel performans paneli</h1></div>
  <section class="tiles">
    <div class="stat"><span class="n">${W.length}</span><span class="l">Toplam kelime</span></div>
    <div class="stat"><span class="n">${s.st.learning+s.st.familiar}</span><span class="l">Öğreniliyor</span></div>
    <div class="stat weak"><span class="n">${s.st.weak}</span><span class="l">Zayıf</span></div>
    <div class="stat mast"><span class="n">${s.st.mastered}</span><span class="l">Kalıcı</span></div>
    <div class="stat"><span class="n">${s.due}</span><span class="l">Tekrar bekleyen</span></div>
    <div class="stat"><span class="n">${streakNow()}</span><span class="l">Seri · en iyi ${S.best||0} · son 30 günde ${days30()} / 30 gün</span></div>
  </section>
  ${mem?`<section class="panel"><h2>Hafıza durumu <small>· ${mem.n} kelime</small></h2><div class="bars">
    ${row("Ortalama ustalık puanı (masteryScore)",mem.mastery/100,"g")}${row("Depolama gücü · storage strength",mem.storage)}${row("Şu an hatırlama olasılığı · retrieval",mem.retrieval,mem.retrieval<.6?"w":"")}</div>
    <p class="note">Storage, kelimenin uzun süreli hafızadaki sağlamlığıdır ve tekrarla büyür. Retrieval, bugün hatırlama olasılığıdır; zamanla düşer. Tekrar sırası retrieval'a göre belirlenir.</p></section>`:""}
  <section class="panel"><h2>Kelime durumları</h2><div class="stackbar" aria-hidden="true">${stack}</div><div class="legend">${legend}</div>
    <p class="note">Kalıcı sayılmak için: en az 3 farklı günde doğru hatırlama, en az 1 eş anlam ve 1 bağlam sorusunu doğru yapma, son 3 tekrarın en az 2'sinde Good ya da Easy ve ustalık puanı en az 75. Puan zamanla düşer; 60'ın altına inerse kelime yeniden tekrara girer.</p></section>
  <section class="panel"><h2>YDS kelime kapsamı <small>· 5 seviye</small></h2>
    <div class="bars">${[1,2,3,4,5].map(l=>row(`L${l} ${LEVELS[l]} · ${LEVELS_TR[l]}`,s.lv[l],"",W.filter(w=>w.l===l).length)).join("")}</div>
    <div class="band"><span class="muted small">Current Vocabulary Stage</span><span class="n">${esc(s.stage)}</span></div>
    <p class="note">Seviyeler ydsPriorityScore'a göre belirlenir (sıklık, akademik kullanım, soru faydası, eş anlam ve okuma faydası). Bu değer yalnızca kelime kapsamını gösterir; YDS sınav puanı tahmini değildir.</p></section>
  <section class="panel"><h2>İçgörüler</h2><ul class="insights">${ins}</ul></section>
  ${vReady()}
  ${vMonth()}
  ${vCoach()}
  <section class="panel"><h2>Haftalık rapor</h2>${vWeekly()}</section>
  <section class="panel"><h2>Soru tipine göre başarı</h2>${skills?`<div class="bars">${skills}</div>`:`<p class="muted small">İlk oturumdan sonra anlam, eş anlam, bağlam, kalıp ve kelime ailesi başarın burada görünür.</p>`}</section>
  ${gr?`<section class="panel"><h2>Anlamsal kümelere göre</h2><div class="tablewrap"><table class="gtable"><tr><th>Küme</th><th class="r">Soru</th><th class="r">Doğru</th></tr>${gr}</table></div></section>`:""}
  <section class="panel"><h2>Son 7 gün</h2><div class="week">${days.join("")}</div><p class="note">Kutudaki sayı o gün çalışılan kelime sayısıdır (yalnızca test çözülen günlerde soru sayısı).</p></section>
  ${mini?`<section class="panel"><h2>Mini YDS geçmişi</h2><div class="tablewrap"><table class="gtable"><tr><th>Tarih</th><th class="r">Soru</th><th class="r">Puan</th><th class="r">Süre</th></tr>${mini}</table></div></section>`:""}
  <section class="panel"><h2>Zayıf kelimeler <small>· weak score</small></h2>
    ${weak.length?`<div class="chips">${weak.slice(0,30).map(id=>`<button class="chipbtn" data-act="detail" data-v="${esc(id)}">${esc(id)} <span class="num">${weakScore(id)}</span></button>`).join("")}</div>`:`<p class="muted small">Şu an zayıf kelime yok.</p>`}
    ${confs.length?`<p class="small muted">Karıştırdıkların: ${confs.slice(0,6).map(c=>`${esc(c[0])} ↔ ${esc(c[1])}`).join(", ")}</p>`:""}</section>
  ${debug?vDebug():""}</div>`;
}
const DEVICE_CHECKS=["Dokunma alanları (≥ 40–44 px)","Yedeği kopyala (pano izni)","Yedeği yapıştır: JSON içe aktarma","Dosya seçici (.json)","Koyu mod kontrastı","Arama kutusunda klavye açılınca yerleşim","Soru geçişlerinde kaydırma konumu","Uzun panellerde (sheet) taşma ve kaydırma","Alt sekme çubuğu: güvenli alan (Home Indicator)","Çentik / safe-area üst boşluk","Yatay-dikey dönüş"];
function nOf(x){return x&&x.n?` <span class="muted small">n=${x.n}</span>`:` <span class="muted small">n=0</span>`}
function aOf(x){return x&&x.a!=null?"%"+pct(x.a):"Insufficient Data"}
