/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
function vDetail(id){
  const w=BY[id],c=S.cards[id],st=statusMap()[id],t=today();
  const due=c?(c.due<=t?"bugün":c.due===t+1?"yarın":`${c.due-t} gün sonra`):null;
  const m=mastery(c);const queued=S.queue.includes(id);
  const prof=Object.keys(SKILLS).map(k=>{const a=c&&accOf(c.sk[k]);return`<div>${SKILL_EN[k]}<b>${a==null?"–":"%"+pct(a)}</b></div>`}).join("");
  const sc=w.sc||{};
  const ms=c?masteryScore(id):0;
  return`<div class="sheet-top"><span class="pill ${st}">${STATUS[st]}</span><button class="iconbtn" data-act="close" aria-label="Kapat">×</button></div>
  <div class="card">${head(w,"")}${cardBody(w,true)}
  ${w.sv?`<p class="small"><span class="tag">destek kelimesi</span> Bağlaç öğretimi, karıştırılan çiftler ve kelime tuzakları için eklendi.</p>`:""}
  ${(LADBY[id]||[]).length?`<div class="sec"><h4>Anlam merdiveni</h4><div class="chips">${LADBY[id].map(L=>`<button class="chipbtn" data-act="ladderopen" data-v="${esc(L.id)}">${esc(L.title)}</button>`).join("")}</div><p class="small muted">${esc(useNote(id))}</p></div>`:""}
  ${isLink(w)&&c?`<div class="sec"><h4>Bağlaç ustalığı</h4><div class="prof">${Object.entries(connMastery(id)).map(([k,v])=>`<div>${CM_LABEL[k]}<b>${v==null?"–":v}</b></div>`).join("")}</div></div>`:""}
  ${c&&c.forgot?`<p class="small muted">Bu kelime ${c.forgot} kez kalıcı olduktan sonra zayıfladı; yeniden öğrenmede bağlam soruları öncelikli.</p>`:""}
  <div class="sec"><h4>Küme ve öncelik</h4><p class="small">${esc(GROUPS[w.g][0])} · ${esc(GROUPS[w.g][1])} · <button class="link" data-act="cluster" data-v="${esc(w.g)}">kümeyi aç</button></p>
    <p class="small muted">ydsPriorityScore <b class="num">${w.p}</b> · sıklık ${sc.frequency} · akademik ${sc.academicUse} · soru ${sc.questionUtility} · eş anlam ${sc.synonymUtility} · okuma ${sc.readingUtility}</p></div>
  ${c?`<div class="sec"><h4>Hafıza</h4><div class="prof"><div>Ustalık<b>${ms}</b></div><div>Depolama<b>%${pct(storageStr(c))}</b></div><div>Bugün hatırlama<b>%${pct(recallProbability(id,t))}</b></div></div>
    ${(()=>{const tf=transferScore(id);return`<div class="prof"><div>Memory mastery<b>${ms}</b></div><div>Transfer mastery<b>${tf?tf.score:"–"}</b></div><div>Tepki<b>${c.rt?(c.rt/1000).toFixed(1)+" sn":"–"}</b></div></div>${tf&&ms-tf.score>=20?`<p class="small muted">Kartta iyi biliyorsun ama sınav benzeri sorularda henüz aynı düzeyde değil; bağlam ve okuma soruları öncelikli.</p>`:""}`})()}
    <h4>Bilgi profili</h4><div class="prof">${prof}</div>
    <p class="small">Sonraki tekrar: <b>${due}</b> · Weak score ${weakScore(id)} · Doğru ${c.correct} · Yanlış ${c.wrong} · Unutma ${c.lapses}</p>
    <ul class="chk"><li class="${m.days?"ok":""}">3 farklı günde doğru (${c.cdays.length}/3)</li><li class="${m.syn?"ok":""}">Eş anlam sorusunda doğru</li><li class="${m.ctx?"ok":""}">Bağlam sorusunda doğru</li><li class="${m.rat?"ok":""}">Son 3 tekrarın 2'si Good / Easy</li><li class="${ms>=75?"ok":""}">Ustalık puanı ≥ 75 (${ms})</li></ul></div>`:""}
  </div>
  ${c?vAdvanced(id):""}
  ${!c?`<button class="btn ${queued?"btn-ghost":"btn-primary"}" data-act="queue" data-v="${esc(id)}">${queued?"Çalışma listende · listeden çıkar":"Bu kelimeyi çalışma listeme ekle"}</button>`:""}`;
}
