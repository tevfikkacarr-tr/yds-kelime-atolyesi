# İçerik kaynakları

`src/data/**` altındaki JSON modülleri bu kaynaklardan üretilmiştir. Uygulamayı derlemek için bu klasöre **gerek yoktur**; yalnızca içeriği yeniden üretmek için saklanır.

- `data/w01.txt … w10.txt` — kelime kayıtları (`kelime|tür|sıklık|küme|anlam|…`)
- `data/fix.txt` — kalite kontrol düzeltmeleri (derleme sırasında uygulanır)
- `data/ctx2.txt`, `data/ctx3.txt` — ek bağlam cümleleri
- `data/bank.txt`, `reading.txt`, `clozes.txt`, `traps.txt`, `ladders.txt`, `relations.txt` — soru ve içerik bankaları
- `build_words.py`, `build_content.py` — doğrulayıcı derleyiciler (`NO ERRORS` vermeli)

Kalibrasyon dönemi boyunca yalnızca yanlış cevap, belirsiz soru, dil bilgisi veya çeviri hatası düzeltilmelidir; büyük ölçekli havuz değişikliği veri karşılaştırılabilirliğini bozar.
