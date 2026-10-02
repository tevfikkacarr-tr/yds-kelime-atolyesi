import json, collections, re

def blocks(path):
    cur = []
    for line in open(path, encoding='utf8'):
        line = line.rstrip('\n')
        if line.startswith('#'): continue
        if not line.strip():
            if cur: yield cur; cur = []
            continue
        cur.append(line)
    if cur: yield cur

def parse_q(lines, errs, src):
    q = {"o": [], "ow": []}
    for l in lines:
        tag, _, rest = l.partition(' ')
        if tag == '@t': q['t'] = rest.strip()
        elif tag == '@p': q['p'] = rest.strip()
        elif tag == '@q': q['q'] = rest.strip()
        elif tag in ('@o', '@o*'):
            text, _, why = rest.partition(' || ')
            q['o'].append(text.strip()); q['ow'].append(why.strip())
            if tag == '@o*':
                if 'a' in q: errs.append(f"{src}: two correct answers in '{q.get('q','')[:40]}'")
                q['a'] = len(q['o']) - 1
        elif tag == '@why': q['why'] = rest.strip()
        elif tag == '@key': q['key'] = [k.strip() for k in rest.split(';') if k.strip()]
        elif tag == '@gram': q['gram'] = rest.strip()
        elif tag == '@w': q['w'] = [k.strip() for k in rest.split(',') if k.strip()]
        elif tag == '@conf': q['conf'] = rest.strip()
        else: errs.append(f"{src}: unknown tag {tag}")
    q.setdefault('w', []); q.setdefault('key', []); q.setdefault('gram', '')
    return q

def check_q(q, errs, src, words):
    lab = f"{src}:{q.get('q','?')[:50]}"
    if 'a' not in q: errs.append(f"{lab}: no correct answer")
    if len(q['o']) != 5: errs.append(f"{lab}: {len(q['o'])} options")
    if len(set(o.lower() for o in q['o'])) != len(q['o']): errs.append(f"{lab}: duplicate options")
    for i, (o, w) in enumerate(zip(q['o'], q['ow'])):
        if i != q.get('a') and not w: errs.append(f"{lab}: missing wrong-option note for '{o}'")
    if not q.get('why'): errs.append(f"{lab}: missing why")
    unknown = [w for w in q['w'] if w not in words]
    q['w'] = [w for w in q['w'] if w in words]
    return unknown

def balance(items):
    # doğru cevabı A–E arasında dengeli dağıt (seçenek ve notları birlikte döndür)
    for i, q in enumerate(items):
        target = i % 5
        a = q['a']
        if a == target: continue
        q['o'][a], q['o'][target] = q['o'][target], q['o'][a]
        q['ow'][a], q['ow'][target] = q['ow'][target], q['ow'][a]
        q['a'] = target

BTYPES = {'vocab', 'connector', 'preposition', 'grammar', 'collocation'}
OLD_TYPES = {}
for line in open('data/cloze_types_old.txt', encoding='utf8'):
    if line.strip():
        cid, n, t = line.strip().split('|'); OLD_TYPES[(cid, int(n))] = t
OLD_TOPIC = {'r1': 'Environment', 'r2': 'Psychology', 'r3': 'Urbanization', 'r4': 'Education', 'r5': 'Medicine', 'r6': 'Education',
             'r7': 'Environment', 'r8': 'Urbanization', 'r9': 'Energy', 'r10': 'Sociology', 'r11': 'Health', 'r12': 'Sociology'}

def auto_diff(text):
    sents = [x for x in re.split(r'[.!?]+\s', text) if x.strip()]
    avg = len(text.split()) / max(1, len(sents))
    return 'easy' if avg < 16 else 'intermediate' if avg < 21 else 'yds'

def parse_ladders(words, errs):
    out, uses = [], collections.Counter()
    for b in blocks('data/ladders.txt'):
        L = {"steps": []}
        for l in b:
            tag, _, rest = l.partition(' ')
            if tag == '@L': L['id'] = rest.strip()
            elif tag == '@title': L['title'] = rest.strip()
            elif tag == '@pos': L['pos'] = rest.strip()
            elif tag == '@s':
                ws, _, note = rest.partition(' | ')
                ids = [x.strip() for x in ws.split(' / ')]
                for x in ids:
                    if x not in words: errs.append(f"ladder {L.get('id')}: unknown word {x}")
                    uses[x] += 1
                L['steps'].append({"w": ids, "note": note.strip()})
        if not 3 <= len(L['steps']) <= 7: errs.append(f"ladder {L.get('id')}: {len(L['steps'])} steps")
        out.append(L)
    for x, n in uses.items():
        if n > 2: errs.append(f"ladder word {x} used {n} times")
    return out

def build(words):
    errs, unknown = [], collections.Counter()
    bank = []
    for b in blocks('data/bank.txt'):
        q = parse_q(b, errs, 'bank'); unknown.update(check_q(q, errs, 'bank', words)); bank.append(q)
    passages, rd = {}, []
    for b in blocks('data/reading.txt'):
        if b[0].startswith('@P '):
            pid = b[0][3:].strip(); p = {"id": pid}
            for l in b[1:]:
                tag, _, rest = l.partition(' ')
                key = {'@title': 'title', '@text': 'text', '@words': 'words', '@topic': 'topic', '@difficulty': 'difficulty', '@target': 'target'}.get(tag)
                if not key: errs.append(f"passage {pid}: unknown tag {tag}"); continue
                p[key] = rest.strip()
            p['words'] = [w.strip() for w in p['words'].split(',') if w.strip() in words]
            n = len(p['text'].split())
            if not 75 <= n <= 150: errs.append(f"passage {pid} has {n} words")
            p.setdefault('topic', OLD_TOPIC.get(pid, 'Science'))
            p.setdefault('difficulty', auto_diff(p['text']))
            if p['difficulty'] not in ('easy', 'intermediate', 'yds'): errs.append(f"passage {pid} difficulty {p['difficulty']}")
            # Dinamik üretime hazır veri modeli
            tw = [w.strip() for w in p.pop('target', '').split(',') if w.strip() in words]
            p['source'] = 'static'; p['targetWords'] = tw or p['words'][:6]; p['questionIds'] = []
            if not 3 <= len(p['targetWords']) <= 6: errs.append(f"passage {pid}: {len(p['targetWords'])} target words")
            passages[pid] = p
        else:
            q = parse_q(b, errs, 'reading'); unknown.update(check_q(q, errs, 'reading', words))
            if q.get('p') not in passages: errs.append(f"reading question without passage: {q.get('q','')[:40]}")
            rd.append(q)
    for pid in passages:
        n = sum(1 for q in rd if q['p'] == pid)
        if n != 3: errs.append(f"passage {pid} has {n} questions")
    for i, q in enumerate(rd):
        if q.get('p') in passages: passages[q['p']]['questionIds'].append('r' + str(i))
        vm = re.search(r'The word “([^”]+)” in the passage', q.get('q', ''))
        if vm and vm.group(1).lower() not in passages.get(q.get('p'), {}).get('text', '').lower(): errs.append(f"vocab word not in passage: {vm.group(1)}")
    clozes = []
    for b in blocks('data/clozes.txt'):
        c = {"blanks": []}
        for l in b:
            tag, _, rest = l.partition(' ')
            if tag == '@C': c['id'] = rest.strip()
            elif tag == '@title': c['title'] = rest.strip()
            elif tag == '@text': c['text'] = rest.strip()
            elif tag == '@topic': c['topic'] = rest.strip()
            elif tag == '@difficulty': c['difficulty'] = rest.strip()
            elif tag == '@conf': c['conf'] = rest.strip()
            elif tag == '@words': c['words'] = [w.strip() for w in rest.split(',') if w.strip() in words]
            elif re.match(r'@b\d', tag):
                btype = None
                m = re.match(r'\[(\w+)\]\s*(.*)', rest)
                if m: btype, rest = m.group(1), m.group(2)
                if btype is None: btype = OLD_TYPES.get((c.get('id'), int(tag[2:])))
                if btype not in BTYPES: errs.append(f"cloze {c.get('id')} {tag}: bad type {btype}")
                opts, _, why = rest.partition(' || ')
                o = [x.strip() for x in opts.split('|')]
                a = [i for i, x in enumerate(o) if x.endswith('*')]
                o = [x.rstrip('*') for x in o]
                if len(a) != 1 or len(o) != 5 or len(set(o)) != 5: errs.append(f"cloze {c.get('id')} {tag}: bad options")
                c['blanks'].append({"o": o, "a": a[0] if a else 0, "why": why.strip(), "type": btype})
        nb = len(re.findall(r'\{\d\}', c['text']))
        if nb != len(c['blanks']) or not 4 <= nb <= 5: errs.append(f"cloze {c['id']}: {nb} slots / {len(c['blanks'])} blanks")
        c.setdefault('topic', 'Science'); c.setdefault('difficulty', auto_diff(re.sub(r'\{\d\}', 'x', c['text'])))
        clozes.append(c)
    traps = []
    for b in blocks('data/traps.txt'):
        t = {}
        for l in b:
            tag, _, rest = l.partition(' ')
            if tag == '@T': t['pair'] = rest.strip()
            elif tag == '@s': t['s'] = rest.strip()
            elif tag == '@o':
                o = [x.strip() for x in rest.split('|')]
                a = [i for i, x in enumerate(o) if x.endswith('*')]
                t['o'] = [x.rstrip('*') for x in o]
                if len(a) != 1: errs.append(f"trap {t.get('s','')[:30]}: correct count")
                t['a'] = a[0] if a else 0
            elif tag == '@e': t['e'] = rest.strip()
        if t.get('s', '').count('___') != 1: errs.append(f"trap blank: {t.get('s')}")
        if len(set(t['o'])) != len(t['o']): errs.append(f"trap duplicate options: {t['s']}")
        traps.append(t)
    # Yinelenen kök kontrolü
    seen = {}
    for q in bank + rd:
        k = q.get('p', '') + re.sub(r'\W+', ' ', q.get('q', '').lower()).strip()
        if k in seen: errs.append(f"duplicate stem: {q['q'][:50]}")
        seen[k] = 1
    ladders = parse_ladders(words, errs)
    # Üretim güveni: needsReview olan içerik kullanıcıya gösterilmez
    held = {'bank': sum(1 for q in bank if q.get('conf') == 'needsReview'), 'reading': sum(1 for q in rd if q.get('conf') == 'needsReview'), 'clozes': sum(1 for c in clozes if c.get('conf') == 'needsReview')}
    bank = [q for q in bank if q.get('conf') != 'needsReview']
    for q in bank + rd: q['conf'] = q.get('conf') or 'reviewed'
    clozes = [c for c in clozes if c.get('conf') != 'needsReview']
    for c in clozes: c['conf'] = c.get('conf') or 'reviewed'
    rel = {}
    for line in open('data/relations.txt', encoding='utf8'):
        if not line.strip(): continue
        a, b, lab, note = line.rstrip('\n').split('|', 3)
        if a not in words or b not in words: errs.append(f"relation unknown word {a}/{b}"); continue
        if lab not in ('strong', 'near', 'context', 'intensity', 'grammar'): errs.append(f"relation label {lab}")
        rel[a + '~' + b if a < b else b + '~' + a] = [lab, note]
    balance(bank); balance(rd)
    return {"bank": bank, "passages": list(passages.values()), "reading": rd, "clozes": clozes, "traps": traps, "ladders": ladders, "rel": rel, "held": held}, errs, unknown

if __name__ == '__main__':
    W = {w['w'] for w in json.load(open('data/words.json', encoding='utf8'))}
    data, errs, unknown = build(W)
    print('bank', collections.Counter(q['t'] for q in data['bank']), len(data['bank']))
    print('reading passages', len(data['passages']), 'questions', len(data['reading']))
    print('clozes', len(data['clozes']), 'traps', len(data['traps']))
    print('held (needsReview)', data['held'], 'relations', len(data['rel']))
    print('ladders', len(data['ladders']), 'cloze types', collections.Counter(b['type'] for c in data['clozes'] for b in c['blanks']))
    print('passage difficulty', collections.Counter(p['difficulty'] for p in data['passages']))
    print('answer positions', collections.Counter(q['a'] for q in data['bank'] + data['reading']))
    print('unknown word refs (dropped):', dict(unknown))
    print('\n'.join(errs) if errs else 'NO ERRORS')
    json.dump(data, open('data/content.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
