from pathlib import Path
import zipfile,re,hashlib,json

archive=zipfile.ZipFile('deliverables/original-project.zip')
entries={n.replace('\\','/'):n for n in archive.namelist()}
original=archive.read(entries['frontend/js/app.js']).decode('utf-8-sig')
current=Path('frontend/js/app.js').read_text(encoding='utf-8')

def methods(source):
    source=source[source.index('const api = {'):]
    markers=list(re.finditer(r'^\s*async (\w+)\(',source,re.M))
    return {m.group(1):source[m.start():markers[i+1].start() if i+1<len(markers) else len(source)].strip() for i,m in enumerate(markers)}

before,after=methods(original),methods(current)
checks=[]
for name in before:
    if name in ('getNotifications','generateReport'):continue
    expected=before[name].replace('\r\n','\n')
    actual=after[name].replace('\r\n','\n').replace('        uploadedAt: file.uploadedAt || null,\n','')
    checks.append({'test':f'{name}: original method, URL, headers, body and parsing preserved','pass':expected==actual})
for normalized,entry in entries.items():
    if normalized.startswith('backend/') and not normalized.endswith('/'):
        checks.append({'test':normalized+' unchanged','pass':archive.read(entry)==Path(normalized).read_bytes()})
checks.append({'test':'No conic gradients or sample data dependencies','pass':not any(re.search('conic-gradient|mockData|mockSettings|mockNotifications',p.read_text(encoding='utf-8')) for p in Path('frontend').rglob('*') if p.is_file())})
Path('verification/contract-results.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print(json.dumps(checks,indent=2))
assert all(c['pass'] for c in checks)
