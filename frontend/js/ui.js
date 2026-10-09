function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function initializeUI(page) {
  wireTheme();
  document.getElementById('openSearchBtn')?.addEventListener('click', () => {
    openModal('<h2 class="modal-title">Find a file</h2><p class="modal-message">Search your workspace by file name or status.</p><form id="globalSearchForm"><label class="form-row">Search<input id="globalSearchInput" type="search" required placeholder="File name or status"></label><button class="btn btn-primary">Search files</button></form>');
    document.getElementById('globalSearchInput').focus();
    document.getElementById('globalSearchForm').onsubmit = e => { e.preventDefault(); const q=document.getElementById('globalSearchInput').value.trim(); if(q) location.href=`files.html?q=${encodeURIComponent(q)}`; };
  });
  const main=document.querySelector('main');
  if(main && !document.getElementById('pageState')) {
    const state=document.createElement('div'); state.id='pageState'; state.className='page-state'; state.setAttribute('role','status');
    main.querySelector('.page-header')?.after(state);
  }
  document.body.dataset.page=page;
}

function wireTheme() {
  const button=document.getElementById('themeToggle');
  if(!button) return;
  function label() {
    const dark=document.documentElement.dataset.theme!=='light';
    button.textContent=dark?'☀ Light mode':'☾ Dark mode';
    button.setAttribute('aria-label',`Switch to ${dark?'light':'dark'} theme`);
  }
  label();
  button.onclick=()=>{
    const theme=document.documentElement.dataset.theme==='light'?'dark':'light';
    document.documentElement.dataset.theme=theme;
    try { localStorage.setItem('cloudsense-theme',theme); } catch(error) { console.warn('Theme persistence unavailable',error); }
    label();
  };
}

function pageState(message='', error=false, retry=null) {
  const el=document.getElementById('pageState'); if(!el) return;
  el.classList.toggle('error',error); el.setAttribute('role',error?'alert':'status');
  el.replaceChildren();
  if(!message) return;
  const text=document.createElement('span'); text.textContent=message; el.append(text);
  if(retry) { const button=document.createElement('button'); button.className='btn btn-ghost'; button.textContent='Retry'; button.onclick=retry; el.append(button); }
}

function ringHTML(value, max=100, label='Health score') {
  const pct=Math.max(0,Math.min(100,Number(value)/Math.max(1,Number(max))*100));
  return `<div class="ring" role="img" aria-label="${escapeHTML(label)}: ${escapeHTML(value)} out of ${escapeHTML(max)}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="50"/><circle class="ring-value" cx="60" cy="60" r="50" pathLength="100" stroke-linecap="round" stroke-dasharray="${pct} 100"/></svg><div class="ring-label"><strong>${escapeHTML(value)}</strong><small>/ ${escapeHTML(max)}</small></div></div>`;
}

const chartColors=['#579dff','#65cce5','#a38bfa','#f0b661','#dc85b3'];
function distributionHTML(storage) {
  const groups=storage.breakdown||[];
  const total=groups.reduce((n,g)=>n+Number(g.bytes||0),0);
  let offset=0;
  const circles=groups.map((g,i)=>{
    const size=total?Number(g.bytes||0)/total*100:0;
    if(!size) return '';
    const gap=Math.min(2,size/3), length=Math.max(.01,size-gap);
    const svg=`<circle cx="60" cy="60" r="50" pathLength="100" stroke-linecap="round" stroke="${chartColors[i%chartColors.length]}" stroke-width="6" style="stroke-width:6" stroke-dasharray="${length} ${100-length}" stroke-dashoffset="${-offset-gap/2}"/>`;
    offset+=size; return svg;
  }).join('');
  return `<div class="distribution"><div class="ring" role="img" aria-label="Storage used: ${escapeHTML(storage.formattedUsed)}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="50"/>${circles}</svg><div class="ring-label"><small>Total used</small><strong>${escapeHTML(storage.formattedUsed)}</strong></div></div><div class="chart-legend">${groups.map((g,i)=>`<div class="legend-row"><span><i style="background:${chartColors[i%chartColors.length]}"></i>${escapeHTML(g.category)}</span><span>${escapeHTML(g.formattedSize)}</span></div>`).join('')}</div></div><p class="chart-note">${escapeHTML(storage.totalGB)} GB capacity · ${total ? 'Current storage by category' : 'No stored files yet'}</p>`;
}

function activityData(files) {
  const days=Array.from({length:7},(_,i)=>{const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-6+i);return {date,bytes:0,count:0};});
  files.forEach(file=>{
    const date=new Date(file.uploadedAt || file.uploaded); if(Number.isNaN(date.getTime())) return;
    date.setHours(0,0,0,0);
    const day=days.find(d=>d.date.getTime()===date.getTime());
    if(day){day.bytes+=file.sizeMB*1024*1024;day.count++;}
  });
  return days;
}
function activityHTML(files) {
  const days=activityData(files), max=Math.max(...days.map(d=>d.bytes),1);
  return `<div class="activity-bars" role="img" aria-label="Bytes uploaded each day during the last seven days">${days.map(d=>`<div class="activity-column" title="${escapeHTML(d.date.toLocaleDateString())}: ${d.count} files, ${formatSize(d.bytes/1024/1024)}"><div class="activity-bar" style="height:${d.bytes/max*100}%"></div></div>`).join('')}</div><div class="activity-labels">${days.map(d=>`<span>${d.date.toLocaleDateString(undefined,{weekday:'short'})}</span>`).join('')}</div><p class="chart-note">${days.reduce((n,d)=>n+d.count,0)} files added · Based on upload dates of currently stored files.</p>`;
}
function showDetails(kind, dashboard, files=[]) {
  let title, rows, note='Current AWS snapshot.';
  if(kind==='activity') {
    title='Storage activity'; rows=activityData(files).map(d=>[d.date.toLocaleDateString(),`${d.count} files · ${formatSize(d.bytes/1024/1024)}`]);
    note='Last seven days in your local timezone. Deleted files are not included; this is not a historical storage-usage log.';
  } else if(kind==='breakdown') {
    title='Storage breakdown'; rows=dashboard.storage.breakdown.map(g=>[g.category,g.formattedSize]); rows.push(['Total used',dashboard.storage.formattedUsed],['Capacity',`${dashboard.storage.totalGB} GB`]);
  } else {
    title='Storage health'; const s=dashboard.summary;
    rows=[['Health score',`${dashboard.health.score}/${dashboard.health.max}`],['Healthy files',s.healthy],['Duplicates',s.duplicates],['Inactive files',s.inactive],['Large files',s.large],['Recoverable storage',s.potentialSavings]];
    note=dashboard.health.subtitle;
  }
  openModal(`<h2 class="modal-title">${title}</h2><p class="modal-message">${escapeHTML(note)}</p>${rows.map(([k,v])=>`<div class="detail-row"><span>${escapeHTML(k)}</span><strong>${escapeHTML(v)}</strong></div>`).join('')}`,{drawer:true});
}
