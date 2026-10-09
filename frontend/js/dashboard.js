document.addEventListener('DOMContentLoaded', () => { renderShell('dashboard'); loadDashboard(); });

async function loadDashboard() {
  pageState('Loading your cloud workspace…');
  document.getElementById('metricGrid').innerHTML=Array.from({length:4},()=>'<div class="skeleton"></div>').join('');
  const status=document.getElementById('awsStatus');
  try {
    const dashboard=await api.getDashboardStats();
    const {health,storage,summary}=dashboard;
    const cards=[['Cloud health',`${health.score}/${health.max}`,health.label,'cloud'],['Storage used',storage.formattedUsed,`of ${storage.totalGB} GB capacity`,'folder'],['Duplicate files',summary.duplicates,`${summary.potentialSavings} recoverable across storage`,'bulb'],['Website scans','…','Loading recent comparisons','globe']];
    document.getElementById('metricGrid').innerHTML=cards.map(([label,value,note,icon],i)=>`<article class="card metric-card"><div class="metric-top"><span class="metric-label">${escapeHTML(label)}</span><span class="metric-icon">${ICONS[icon]}</span></div><strong class="metric-value" ${i===3?'id="scanCount"':''}>${escapeHTML(value)}</strong><span class="metric-note" ${i===3?'id="scanNote"':''}>${escapeHTML(note)}</span></article>`).join('');
    document.getElementById('healthCard').innerHTML=`${ringHTML(health.score,health.max)}<div class="health-info"><span class="health-badge">${escapeHTML(health.label)}</span><h3>${summary.totalFiles} files in your cloud</h3><p class="desc">${escapeHTML(health.subtitle)}</p><p class="chart-note">${summary.inactive} inactive · ${summary.large} large</p><a href="analytics.html" class="link-btn">Explore analytics →</a></div>`;
    document.getElementById('storageUsedBlock').innerHTML=distributionHTML(storage);
    document.querySelector('[data-detail="breakdown"]').onclick=()=>showDetails('breakdown',dashboard);
    document.querySelector('[data-detail="health"]').onclick=()=>showDetails('health',dashboard);
    status.dataset.state='connected'; status.textContent=`AWS statistics connected · Updated ${new Date().toLocaleTimeString()} · ap-south-1`;
    pageState();
    await Promise.allSettled([
      loadDashboardPart('storageActivity',async()=>{
        const files=await api.getFiles();
        document.getElementById('storageActivity').innerHTML=activityHTML(files);
        const button=document.querySelector('[data-detail="activity"]');button.disabled=false;button.onclick=()=>showDetails('activity',dashboard,files);
      }),
      loadDashboardPart('dashboardRecPreview',async()=>{
        const recs=await api.getRecommendations();
        document.getElementById('dashboardRecPreview').innerHTML=recs.length?recs.slice(0,3).map(rec=>`<div class="compact-rec"><span class="nav-icon">${ICONS.bulb}</span><div><strong>${escapeHTML(rec.title||rec.problem)}</strong><p>${escapeHTML(rec.fileName)} · ${escapeHTML(rec.saving)}</p></div><a class="link-btn" href="files.html?q=${encodeURIComponent(rec.fileName)}">Review</a></div>`).join(''):emptyRecommendationsHTML();
      }),
      (async()=>{try {const scans=await api.getWebsiteScans();document.getElementById('scanCount').textContent=scans.length;document.getElementById('scanNote').textContent='Saved recent comparisons';}catch(error){console.error(error);document.getElementById('scanCount').textContent='—';document.getElementById('scanNote').innerHTML='<a href="website-similarity.html">History unavailable · Open to retry</a>';}})()
    ]);
  } catch(error) {
    console.error(error); document.getElementById('metricGrid').innerHTML='';
    status.dataset.state='error';status.textContent='AWS statistics unavailable';
    pageState('We could not load your dashboard. Please try again.',true,loadDashboard);
  }
}

async function loadDashboardPart(id, load) {
  const el=document.getElementById(id);el.textContent='Loading…';
  try {await load();} catch(error) {
    console.error(error);el.innerHTML='<p class="chart-note">This data is currently unavailable.</p><button class="btn btn-ghost">Retry</button>';
    el.querySelector('button').onclick=()=>loadDashboardPart(id,load);
    if(id==='storageActivity') document.querySelector('[data-detail="activity"]').disabled=true;
  }
}
