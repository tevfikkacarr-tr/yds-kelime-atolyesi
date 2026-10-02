/* YDS Kelime Atölyesi — motor parçası. scripts/build-engine.mjs bu dosyaları sırayla birleştirir. */
/* ================= VERİ ================= */
/* Veri istemci tarafında modüllerden yüklenir (bkz. src/lib/engine/load.ts); test ortamı da aynı nesneyi kullanır. */
const __D=(typeof globalThis!=="undefined"&&globalThis.__YDS_DATA)||{};
const W=__D.words||/*WORDS*/[];
const CONTENT=__D.content||/*CONTENT*/{};
const BANK=CONTENT.bank||[],PASSAGES=CONTENT.passages||[],RD=CONTENT.reading||[],CLOZES=CONTENT.clozes||[],TRAPS=CONTENT.traps||[];
const BY={};W.forEach(w=>{w.exPlain=w.ex.replace(/\*/g,"");BY[w.id]=w});
const PBY={};PASSAGES.forEach(p=>PBY[p.id]=p);
const LADDERS=CONTENT.ladders||[];
const LADBY={};LADDERS.forEach(L=>L.steps.forEach(st=>st.w.forEach(id=>(LADBY[id]=LADBY[id]||[]).push(L))));
const sameLadder=(a,b)=>!!(LADBY[a]&&LADBY[b]&&LADBY[a].some(L=>LADBY[b].includes(L)));
const SUPPORT_N=W.filter(w=>w.sv).length,CORE_N=W.length-SUPPORT_N;
const GROUPS={
  increase:["ARTMAK / ARTIRMAK","Increase","decrease"],decrease:["AZALMAK / AZALTMAK","Decrease","increase"],
  important:["ÖNEMLİ / TEMEL","Importance"],cause:["SEBEP / SONUÇ","Cause / Effect"],
  prevent:["ENGELLEMEK / KISITLAMAK","Prevention","enable"],enable:["SAĞLAMAK / DESTEKLEMEK","Support / Enable","prevent"],
  maintain:["SÜRDÜRMEK / KORUMAK","Maintain / Protect","harm"],achieve:["ELDE ETMEK / BAŞARMAK","Achieve / Obtain"],
  show:["GÖSTERMEK / ORTAYA KOYMAK","Show / Reveal"],research:["ARAŞTIRMAK / İNCELEMEK","Research"],
  evaluate:["DEĞERLENDİRMEK / ÖLÇMEK","Assess / Measure"],change:["DEĞİŞMEK / DÖNÜŞTÜRMEK","Change"],
  amount:["MİKTAR / YETERLİLİK","Quantity"],certain:["OLASILIK / KESİNLİK","Probability"],
  attitude:["TUTUM / İSTEKLİLİK","Attitude"],create:["OLUŞTURMAK / GELİŞTİRMEK","Create / Develop"],
  think:["DÜŞÜNMEK / VARSAYMAK","Think / Predict"],claim:["İDDİA ETMEK / VURGULAMAK","Claim / State"],
  need:["GEREKTİRMEK / BAĞLI OLMAK","Need / Depend"],include:["İÇERMEK / OLUŞMAK","Include / Consist"],
  harm:["ZARAR / TEHDİT","Harm / Risk","maintain"],solve:["ÇÖZMEK / BAŞA ÇIKMAK","Solve / Cope"],
  difficulty:["ZORLUK / ENGEL","Difficulty","benefit"],benefit:["FAYDA / AVANTAJ","Benefit","difficulty"],
  similar:["BENZERLİK / FARK","Similarity / Difference"],accurate:["DOĞRULUK / GÜVENİLİRLİK","Accuracy"],
  clear:["AÇIKLIK / BELİRSİZLİK","Clarity"],begin:["BAŞLAMAK / SONA ERDİRMEK","Start / End"],
  time:["ZAMAN / SÜRE","Time"],scope:["KAPSAM / YAYGINLIK","Scope"],emerge:["ORTAYA ÇIKMAK / VAR OLMAK","Emerge / Exist"],
  explain:["AÇIKLAMAK / TANIMLAMAK","Explain / Define"],accept:["KABUL / RET","Accept / Reject"],
  use:["KULLANMAK / UYGULAMAK","Use / Apply"],influence:["ETKİLEMEK / TEŞVİK ETMEK","Influence"],
  control:["YÖNETMEK / DÜZENLEMEK","Control / Regulate"],combine:["BİRLEŞTİRMEK / AYIRMAK","Combine / Separate"],
  adverb:["DERECE VE MİKTAR ZARFLARI","Adverbs"],concept:["AKADEMİK KAVRAMLAR","Academic Nouns"],
  society:["TOPLUM / EKONOMİ","Society / Economy"],science:["BİLİM / SAĞLIK / ÇEVRE","Science / Health"],
  lcontrast:["BAĞLAÇ: ZITLIK","Linkers: Contrast"],lresult:["BAĞLAÇ: SONUÇ","Linkers: Result"],
  lcause:["BAĞLAÇ: SEBEP","Linkers: Cause"],ladd:["BAĞLAÇ: EKLEME / HARİÇ","Linkers: Addition"],
  lcond:["BAĞLAÇ: KOŞUL","Linkers: Condition"],lexample:["BAĞLAÇ: ÖRNEK / AÇIKLAMA","Linkers: Example"],
  lpurpose:["BAĞLAÇ: AMAÇ","Linkers: Purpose"]
};
const POS_EN={v:"verb",n:"noun",adj:"adjective",adv:"adverb",pv:"phrasal verb",conj:"conjunction",prep:"preposition","adv-link":"linking adverb"};
const POS_TR={v:"fiil",n:"isim",adj:"sıfat",adv:"zarf",pv:"deyimsel fiil",conj:"bağlaç",prep:"edat","adv-link":"bağlayıcı zarf"};
const posLabel=p=>p.split("/").map(x=>POS_EN[x]||x).join(" / ")+" · "+p.split("/").map(x=>POS_TR[x]||x).join(" / ");

const LEVELS={1:"Core YDS",2:"High Frequency Academic",3:"Intermediate YDS",4:"Advanced YDS",5:"High Score Vocabulary"};
const LEVELS_TR={1:"Temel YDS",2:"Sık akademik",3:"Orta YDS",4:"İleri YDS",5:"Yüksek puan"};
const PAIRS=[
  {ws:["affect","effect"],tip:"affect fiildir: to affect sth (etkilemek). effect isimdir: an effect on sth (etki). Cümlede “a / an / the” varsa çoğunlukla effect gelir."},
  {ws:["adapt","adopt"],tip:"adapt (to): uyum sağlamak, uyarlamak. adopt: bir fikri, politikayı ya da yöntemi benimseyip kullanmaya başlamak."},
  {ws:["rise","raise"],tip:"rise nesne almaz: Prices rise. raise nesne alır: The government raises taxes. Çekimler: rise–rose–risen, raise–raised–raised."},
  {ws:["economic","economical"],tip:"economic: ekonomiyle ilgili (economic growth). economical: tutumlu, az harcayan (an economical car)."},
  {ws:["comprehensive","comprehensible"],tip:"comprehensive: kapsamlı (a comprehensive study). comprehensible: anlaşılır (comprehensible to readers)."},
  {ws:["ensure","assure","insure"],tip:"ensure: bir şeyin olmasını garanti etmek (ensure that…). assure: birine güvence vermek (assure sb that…). insure: sigortalamak (insure sth against…)."},
  {ws:["beside","besides"],tip:"beside: yanında (yer bildirir). besides: -in yanı sıra / ayrıca."},
  {ws:["accept","except"],tip:"accept: kabul etmek (fiil). except: hariç, dışında (edat)."},
  {ws:["principal","principle"],tip:"principal: ana, başlıca; okul müdürü. principle: ilke, prensip."},
  {ws:["considerable","considerate"],tip:"considerable: hatırı sayılır, büyük. considerate: düşünceli, başkalarını önemseyen."},
  {ws:["imply","infer"],tip:"imply: ima etmek (konuşan ya da yazan yapar). infer: sonuç çıkarmak (dinleyen ya da okuyan yapar)."},
  {ws:["although","despite"],tip:"although + cümle (özne + yüklem): although it rained. despite + isim / -ing: despite the rain."},
  {ws:["respectively","respectfully"],tip:"respectively: sırasıyla (listelenen öğeleri eşleştirir). respectfully: saygıyla, saygılı bir şekilde."},
  {ws:["because","because of"],tip:"because + cümle (özne + yüklem): because it rained. because of + isim: because of the rain."}
].filter(p=>p.ws.every(w=>BY[w]));
const pairKey=(a,b)=>[a,b].sort().join("~");
const PAIRMAP={};PAIRS.forEach(p=>{for(const a of p.ws)for(const b of p.ws)if(a!==b)PAIRMAP[pairKey(a,b)]=p});
const SKILLS={mean:"Anlam",syn:"Eş anlam",ctx:"Bağlam",coll:"Kalıp (collocation)",fam:"Kelime ailesi",conf:"Karıştırılan kelimeler"};
const SKILL_EN={mean:"Meaning",syn:"Synonym",ctx:"Context",coll:"Collocation",fam:"Word family",conf:"Confusion"};
const KIND_SKILL={place:"mean",cpunct:"ctx",mean:"mean",reverse:"mean",syn:"syn",cloze:"ctx",guess:"ctx",yctx:"ctx",coll:"coll",fam:"fam",pairq:"conf",trap:"conf",cstruct:"ctx",cfunc:"ctx",cid:"ctx",yds:"ctx",rdq:"ctx",clz:"ctx"};
const OPTK=["mean","syn","cloze","guess","yctx","coll","fam","pairq","cstruct","cfunc","cid","cpunct","place"];
const YT={vocab:"Vocabulary",ct:"Cloze Test",sc:"Sentence Completion",tr:"Translation",rs:"Restatement",pc:"Paragraph Completion",rd:"Reading",rv:"Reading Vocabulary"};
const LEN={quick:{label:"Hızlı",min:10,cap:45,nm:.4,mini:3},normal:{label:"Normal",min:20,cap:90,nm:1,mini:6},deep:{label:"Derin",min:30,cap:135,nm:1.35,mini:10}};
/* Günlük oturum oranları (yük birimi payı). Kullanıcı performansına göre adaptRatios() ile değişir. */
const RATIOS={due:.35,weak:.20,new:.20,syn:.10,ctx:.10,conf:.05};
const UNIT={flash:.6,new:3,weak:3,q:1,conf:2};
const LAD=[0,1,3,7,14,30,60,120];
const CTX_LEVELS={1:"Kolay",2:"Orta",3:"YDS"};
const CONN_FN={lcontrast:"zıtlık (contrast)",lresult:"sonuç (result)",lcause:"sebep (cause)",ladd:"ekleme / hariç tutma (addition)",lcond:"koşul (condition)",lexample:"örnek / açıklama (example)",lpurpose:"amaç (purpose)"};
const STRUCT={clause:"özne + yüklem (tam bir yan cümle)",noun:"isim / isim öbeği / V-ing",adv:"ayrı bir cümle: nokta ya da noktalı virgülden sonra gelir, ardından virgül",verb:"yalın fiil (to + V1)"};
const STRUCT_SHORT={clause:"+ cümle",noun:"+ isim / V-ing",adv:"cümleler arası",verb:"+ yalın fiil"};
const CONN_SKIP=new Set(["beside"]);

