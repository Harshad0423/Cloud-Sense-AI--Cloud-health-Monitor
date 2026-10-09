document.addEventListener('DOMContentLoaded', async () => {
  wireTheme();
  const el=document.getElementById('landingHealth');
  async function load() {
    el.textContent='Loading your cloud health…';
    try {
      const data=await api.getDashboardStats();
      el.innerHTML=`<div class="hero-visual-head"><span>Cloud health</span><span>Live AWS data</span></div><div class="health-card">${ringHTML(data.health.score,data.health.max)}<div><h2>${escapeHTML(data.health.label)}</h2><p class="chart-note">${escapeHTML(data.storage.formattedUsed)} stored · ${escapeHTML(data.summary.totalFiles)} files</p></div></div>`;
    } catch(error) {
      console.error(error); el.innerHTML='<h2>Cloud health unavailable</h2><p class="chart-note">We could not connect to your storage.</p><button class="btn btn-ghost" id="retryLanding">Retry</button>';
      document.getElementById('retryLanding').onclick=load;
    }
  }
  await load();
});
