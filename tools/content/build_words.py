import json, glob, re, collections
F = ["word","pos","freq","group","main","sec","syn","ant","fam","col","pat","ex","tr","cz","note","hint","gloss","bad","conf","czd","gd"]
LIST = {"syn","ant","col","pat","bad","conf","czd","gd"}
# Grup profilleri: (academicUse, questionUtility, readingUtility) — elle belirlenen taban değerler
PROFILE = {
 "increase":(85,92,90),"decrease":(85,92,90),"important":(88,90,90),"cause":(90,95,92),"prevent":(85,88,85),"enable":(85,85,82),
 "maintain":(82,82,80),"achieve":(80,80,80),"show":(92,88,90),"research":(95,85,88),"evaluate":(92,80,82),"change":(85,85,85),
 "amount":(82,85,85),"certain":(85,88,86),"attitude":(70,85,78),"create":(82,80,80),"think":(85,82,85),"claim":(90,85,88),
 "need":(82,82,80),"include":(88,85,85),"harm":(80,82,84),"solve":(82,82,80),"difficulty":(80,80,82),"benefit":(80,80,82),
 "similar":(85,82,82),"accurate":(88,80,80),"clear":(82,80,82),"begin":(78,78,76),"time":(80,80,85),"scope":(85,80,82),
 "emerge":(85,82,85),"explain":(85,78,80),"accept":(78,80,80),"use":(85,78,78),"influence":(85,85,85),"control":(82,75,78),
 "combine":(80,75,78),"adverb":(85,85,90),"concept":(95,78,90),"society":(80,75,88),"science":(80,72,90),
}
for g in ["lcontrast","lresult","lcause","ladd","lcond","lexample","lpurpose"]: PROFILE[g]=(75,98,95)
LEVELS = ["Core YDS","High Frequency Academic","Intermediate YDS","Advanced YDS","High Score Vocabulary"]
clamp = lambda x: max(1, min(100, round(x)))

def load_fixes():
    fx = collections.defaultdict(dict); n = 0
    for line in open('data/fix.txt', encoding='utf8'):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'): continue
        w, f, v = line.split('|', 2); fx[w][f] = v; n += 1
    return fx, n

def load_kv(path, nfields):
    d = {}
    try:
        for line in open(path, encoding='utf8'):
            line = line.rstrip('\n')
            if not line.strip() or line.startswith('#'): continue
            p = [x.strip() for x in line.split('|')]
            if len(p) != nfields: raise ValueError(f"{path}: bad line {line[:60]}")
            d[p[0]] = p[1:]
    except FileNotFoundError: pass
    return d

# Destek kelimeleri: bağlaç öğretimi, karıştırılan çiftler ve kelime tuzakları için eklenen 9 kelime (çekirdek 558'e dahil değil)
SUPPORT = {"cause", "prompt", "responsible", "while", "because", "as", "if", "respectively", "respectfully"}

def build():
    fixes, nfix = load_fixes()
    words, seen, errs = [], set(), []
    for path in sorted(glob.glob('data/w*.txt')):
        for n, line in enumerate(open(path, encoding='utf8'), 1):
            line = line.rstrip('\n')
            if not line.strip() or line.startswith('#'): continue
            p = [x.strip() for x in line.split('|')]
            if len(p) != len(F): errs.append(f"{path}:{n} field count {len(p)} ({p[0]})"); continue
            d = dict(zip(F, p)); d['cwx'] = ''
            for f, v in fixes.get(d['word'], {}).items():
                if f not in d: errs.append(f"fix unknown field {f}"); continue
                d[f] = v
            w = d['word']
            if w in seen: errs.append(f"duplicate word {w}")
            seen.add(w)
            lst = lambda k: [x.strip() for x in d[k].split(';') if x.strip()]
            freq = int(d['freq'])
            fam = []
            for x in lst('fam') if False else [x.strip() for x in d['fam'].split(';') if x.strip()]:
                bits = x.rsplit(' ', 1)
                if len(bits) != 2: errs.append(f"fam '{x}' {w}"); continue
                fam.append(bits)
            words.append({"id": w, "w": w, "pos": d['pos'], "f": freq, "g": d['group'], "tr": d['main'], "tr2": d['sec'],
                "syn": lst('syn'), "ant": lst('ant'), "fam": fam, "col": lst('col'), "pat": lst('pat'),
                "ex": d['ex'], "exTr": d['tr'], "cz": d['cz'], "note": d['note'], "hint": d['hint'], "en": d['gloss'],
                "bad": lst('bad'), "cw": lst('conf'), "cwx": d['cwx'], "czd": lst('czd'), "gd": lst('gd')})
    for w in fixes:
        if w not in seen: errs.append(f"fix for unknown word {w}")
    BY = {w['w']: w for w in words}
    # ek alanlar
    x2 = load_kv('data/ctx2.txt', 2); nu = load_kv('data/nuance.txt', 2); cn = load_kv('data/connectors.txt', 5)
    for k in list(x2)+list(nu)+list(cn):
        if k not in BY: errs.append(f"extra data for unknown word {k}")
    cx = collections.defaultdict(list)
    for line in open('data/ctx3.txt', encoding='utf8'):
        line = line.rstrip('\n')
        if not line.strip() or line.startswith('#'): continue
        k, _, sent = line.partition('|')
        if k not in BY: errs.append(f"ctx3 unknown word {k}"); continue
        if sent.count('___') != 1: errs.append(f"ctx3 slot count {k}: {sent}"); continue
        old = {BY[k]['cz'], x2.get(k, [''])[0]}
        if sent in old or sent in cx[k]: errs.append(f"ctx3 duplicate {k}"); continue
        cx[k].append(sent)
    for k in SUPPORT:
        if k not in BY: errs.append(f"support word missing {k}")
    gsize = collections.Counter(w['g'] for w in words)
    for w in words:
        a, q, r = PROFILE.get(w['g'], (80, 80, 80))
        poolsyn = sum(1 for s in w['syn'] if s in BY)
        w['sc'] = {
            "frequency": w['f'],
            "academicUse": clamp(a + (w['f'] - 75) * .3),
            "questionUtility": clamp(q + (4 if w['cw'] else 0) + (3 if len(w['bad']) >= 3 else 0) + (w['f'] - 75) * .2),
            "synonymUtility": clamp((70 if w['g'][0] == 'l' else 45) + 10 * min(poolsyn, 4) + min(gsize[w['g']], 15) * .6),
            "readingUtility": clamp(r + (w['f'] - 75) * .4),
        }
        s = w['sc']
        w['p'] = round(.35 * s['frequency'] + .2 * s['academicUse'] + .2 * s['questionUtility'] + .15 * s['synonymUtility'] + .1 * s['readingUtility'], 1)
        w['u'] = max(1, min(10, round(w['p'] / 10)))
        if w['w'] in x2: w['x2'] = x2[w['w']][0]
        if w['w'] in nu: w['nu'] = nu[w['w']][0]
        if w['w'] in cn: w['cn'] = dict(zip(["struct", "position", "punct", "diff"], cn[w['w']]))
        if w['w'] in cx: w['cx'] = cx[w['w']]
        if w['w'] in SUPPORT: w['sv'] = True
    ranked = sorted(words, key=lambda w: -w['p'])
    cuts = [.15, .40, .65, .85, 1.0]
    for i, w in enumerate(ranked):
        q = (i + 1) / len(ranked)
        w['l'] = next(k + 1 for k, c in enumerate(cuts) if q <= c)
    return words, errs, nfix

if __name__ == '__main__':
    words, errs, nfix = build()
    print(len(words), 'words;', nfix, 'fix lines')
    print(collections.Counter(w['l'] for w in words))
    print('\n'.join(errs) if errs else 'NO ERRORS')
    json.dump(words, open('data/words.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
