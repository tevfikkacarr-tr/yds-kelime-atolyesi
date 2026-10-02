/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* Karşılama: en fazla 3 adım; yalnızca ilk oturum yükünü ayarlar */
let OB={step:0};
function needsOnboarding(){return!S.profile&&!Object.keys(S.cards).length}
const OB_Q=[{k:"target",q:"YDS hedefin nedir?",o:["50–60","60–70","70–80","80+"]},{k:"minutes",q:"Günde kaç dakika çalışabilirsin?",o:["10","20","30"]},{k:"level",q:"Şu anki seviyen?",o:["Başlangıç","Yaklaşık 40","Yaklaşık 50","60+"]}];
function vOnboard(){
  if(OB.step>=OB_Q.length)return`<div class="stack"><div><div class="eyebrow">Hazır</div><h1 class="sumhead">İlk çalışman hazır</h1></div>
    <section class="panel"><p>Günde ${esc(OB.minutes)} dakika · ilk oturumda ${S.firstNew} yeni kelime. Bu ayarlar yalnızca başlangıç yükünü belirler; sistem sonra senin hatırlama verine göre uyum sağlar.</p></section>
    <button class="btn btn-primary" data-act="start">İLK ÇALIŞMAYA BAŞLA</button><button class="link" data-act="place">Önce seviyemi ölç (18 soru, isteğe bağlı)</button></div>`;
  const Q=OB_Q[OB.step];
  return`<div class="stack"><div><div class="eyebrow">YDS Kelime Atölyesi · ${OB.step+1}/3</div><h1 class="sumhead">${esc(Q.q)}</h1></div>
  <div class="opts" role="group" aria-label="${esc(Q.q)}">${Q.o.map(o=>`<button class="opt" data-act="ob" data-v="${esc(o)}"><span>${esc(o)}${Q.k==="minutes"?" dakika":""}</span></button>`).join("")}</div>
  <button class="link" data-act="ob" data-v="__skip">Atla, varsayılan ayarlarla başla</button></div>`;
}
function obStep(v){
  if(v==="__skip"){S.profile={skipped:true,d:today()};save();render();return}
  const Q=OB_Q[OB.step];OB[Q.k]=v;OB.step++;
  if(OB.step>=OB_Q.length){
    S.profile={target:OB.target,minutes:+OB.minutes,level:OB.level,d:today()};
    S.settings.length={10:"quick",20:"normal",30:"deep"}[OB.minutes]||"normal";
    S.firstNew={"Başlangıç":8,"Yaklaşık 40":10,"Yaklaşık 50":12,"60+":15}[OB.level]||12;
    S.readLevel=OB.level==="60+"?2:OB.level==="Başlangıç"?0:1;REV++;save();
  }
  render();
}
function vStudy(){
  const m=(act,v,title,desc,dis)=>`<button class="sc wide" data-act="${act}"${v!=null?` data-v="${esc(v)}"`:""}${dis?" disabled":""}><b>${title}</b><span>${desc}</span></button>`;
  const dueN=dueList().length,weakN=weakList().length;
  const p=pickPassage(),c=pickCloze();
  const linkN=W.filter(w=>isLink(w)&&w.cn).length;
  return`<div class="stack">
  <div><div class="eyebrow">Çalışma modları</div><h1 class="sumhead" style="font-size:27px">Çalış</h1></div>
  <section class="panel"><h2>Hafıza</h2><div class="modes">
    ${m("start",null,"Günlük akıllı oturum","Tekrar, zayıf, yeni, eş anlam, bağlam ve karıştırılan kelimeler dengeli dağıtılır.",S.doneDay===today())}
    ${m("quick",null,"Hızlı tekrar",dueN?`${Math.min(dueN,30)} kelime`:"Bekleyen tekrar yok",!dueN)}
    ${m("weak",null,"Zayıf kelimeler",weakN?`${Math.min(weakN,8)} kelime`:"Şu an zayıf kelime yok",!weakN)}
    ${m("favstudy",null,"Favoriler",S.fav.length?`${Math.min(S.fav.length,20)} kelime`:"Henüz favori yok",!S.fav.length)}
  </div></section>
  <section class="panel"><h2>İlişkilendir</h2><div class="modes">
    ${m("clusters",null,"Eş anlam kümeleri ve merdiven","Yakın anlamlılar ve kullanım farkları; temelden yüksek puana.")}
    ${m("connopen",null,"Bağlaç ustası",`${linkN} bağlaç: anlam, yapı, konum, noktalama.`)}
    ${m("trap",null,"Kelime tuzağı","rise/raise, affect/effect, adapt/adopt… mikro testler.")}
    ${m("pairsopen",null,"Karıştırılan kelimeler",`${PAIRS.length} çift, yan yana açıklama.`)}
  </div></section>
  <section class="panel"><h2>Kullan</h2><div class="modes">
    ${m("read",null,"Okuma köprüsü",p?`“${esc(p.title)}” · 3 soru`:"Pasaj yok",!p)}
    ${m("clz",null,"Cloze köprüsü",c?`“${esc(c.title)}” · ${c.blanks.length} boşluk`:"Pasaj yok",!c)}
    ${m("ydsopen",null,"Mini YDS","Vocabulary, cloze, sentence completion, translation, restatement, paragraph completion, reading.")}
    ${m("weekly",null,"Haftalık rapor","Bu haftanın özeti ve gelecek haftanın odağı.")}
    ${m("place",null,"Seviyemi ölç","18 soruluk kısa kelime yerleştirme testi (YDS puanı değildir).")}
  </div></section></div>`;
}

