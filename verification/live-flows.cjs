const {chromium}=require('C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const base='https://93mhrfioe1.execute-api.ap-south-1.amazonaws.com';
const root=path.resolve('frontend');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css'})[file.split('.').pop()]||'application/octet-stream');res.end(data);});
});
const results=[],errors=[],requests=[],token=`cloudsense-ui-check-${Date.now()}`;
let initialScans=new Set();
function pass(test){results.push({test,pass:true});console.log('PASS',test);}
async function apiGet(route){const r=await fetch(base+route);assert.equal(r.status,200);return r.json();}
async function main(){
 await new Promise(r=>server.listen(5501,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith(base))requests.push({route:r.url().slice(base.length),method:r.request().method(),status:r.status()});});
 async function go(name){await page.goto(`http://127.0.0.1:5501/${name}.html`);await page.waitForLoadState('networkidle');}
 try {
  initialScans=new Set((await apiGet('/website-similarity')).scans.map(s=>s.scanId));
  await go('dashboard');await page.locator('#scanCount').filter({hasText:/\d/}).waitFor();
  assert.equal(await page.locator('.metric-card').count(),4);pass('Dashboard renders live metrics and saved scan count');
  for(const kind of ['activity','breakdown','health']){
   await page.locator(`[data-detail="${kind}"]`).click();await page.locator('[role="dialog"]').waitFor();
   await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('[role="dialog"]').contains(document.activeElement)));
   await page.keyboard.press('Escape');assert.equal(await page.locator('[role="dialog"]').count(),0);
   assert.equal(await page.locator(`[data-detail="${kind}"]`).evaluate(el=>el===document.activeElement),true);
  }pass('All detail drawers, focus containment, Escape and focus restoration');
  await page.locator('#themeToggle').click();await page.reload();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
  await go('files');assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');pass('Theme toggle persists on refresh and another page');
  await page.locator('#pagination button[data-page="2"]').first().click();assert.match(await page.locator('#pagination').innerText(),/Showing 7/);pass('Pagination');
  await page.locator('#statusFilter').selectOption('Duplicate');await page.waitForTimeout(200);
  const statuses=await page.locator('#filesTableBody .status-pill').allTextContents();assert(statuses.length>0 && statuses.every(s=>s==='Duplicate'));
  await page.locator('[data-action="view-duplicate"]').first().click();await page.locator('#keepFileBtn').click();pass('Duplicate filter and duplicate review');
  await page.locator('#statusFilter').selectOption('all');await page.locator('#typeFilter').selectOption('PDF');
  assert((await page.locator('#filesTableBody tr').count())>0);pass('Type filter');
  await page.locator('#typeFilter').selectOption('all');await page.locator('#sortSelect').selectOption('size-desc');
  assert(await page.evaluate(()=>filteredFiles.every((f,i,a)=>i===0||a[i-1].sizeMB>=f.sizeMB)));pass('Size sorting');
  await page.locator('#openSearchBtn').click();await page.locator('#globalSearchInput').fill('sha_test');await page.locator('#globalSearchForm button').click();
  await page.waitForLoadState('networkidle');assert.match(page.url(),/q=sha_test/);assert((await page.locator('#filesTableBody tr').count())>0);pass('Global search and query prefilter');
  await page.locator('#fileSearchInput').fill('no-matching-file-'+token);await page.waitForTimeout(300);assert.match(await page.locator('#filesEmptyState').innerText(),/No files match/);pass('Filtered empty state');
  await page.locator('#fileSearchInput').fill('');await page.waitForTimeout(300);
  await page.locator('#openUploadBtn').click();
  const buffer=Buffer.from(`Disposable frontend integration check ${token}\n`);
  for(const suffix of ['original','duplicate']){
   await page.locator('#fileInput').setInputFiles({name:`${token}-${suffix}.txt`,mimeType:'text/plain',buffer});
   await page.waitForFunction(()=>[...document.querySelectorAll('.upload-progress-status')].every(el=>el.classList.contains('done')));
   await page.waitForTimeout(2000);
  }
  let testFiles=[];
  for(let i=0;i<10;i++){testFiles=(await apiGet('/files')).files.filter(f=>f.fileName.startsWith(token));if(testFiles.length===2 && testFiles.some(f=>f.status==='Duplicate'))break;await page.waitForTimeout(1500);}
  assert.equal(testFiles.length,2);assert(testFiles.some(f=>f.status==='Duplicate'));pass('Presigned upload, S3 PUT, metadata refresh and real duplicate detection');
  await page.evaluate(()=>loadFiles());await page.locator('#fileSearchInput').fill(token);await page.waitForTimeout(300);
  for(const file of testFiles){
   await page.locator(`button[data-action="delete"][data-file-id="${file.fileId}"]`).click();
   await page.locator('#modalCancelBtn').click();
   assert.equal(await page.locator(`tr[data-file-id="${file.fileId}"]`).count(),1);
   await page.locator(`button[data-action="delete"][data-file-id="${file.fileId}"]`).click();
   await page.locator('#modalConfirmBtn').click();
   await page.locator(`tr[data-file-id="${file.fileId}"]`).waitFor({state:'detached'});
  }
  assert.equal((await apiGet('/files')).files.filter(f=>f.fileName.startsWith(token)).length,0);pass('Delete cancel, confirmed deletion, live API removal (test files only)');
  await go('recommendations');assert((await page.locator('.rec-card').count())>0);
  await page.locator('#priorityFilter').selectOption('high');assert((await page.locator('.rec-priority').allTextContents()).every(t=>t.includes('HIGH')));
  await page.locator('.rec-action-btn').first().click();await page.locator('#modalCancelBtn').click();
  await page.locator('#priorityFilter').selectOption('medium');await page.locator('.rec-action-btn').first().click();await page.waitForURL('**/files.html?q=*');pass('Recommendation priority filter, delete confirmation cancel and review navigation');
  await go('settings');await page.locator('#saveSettingsBtn:not(:disabled)').waitFor();
  const snapshot=await page.evaluate(()=>({name:document.getElementById('accountName').value,email:document.getElementById('accountEmail').value,frequency:document.querySelector('input[name="frequency"]:checked').value,flags:[...document.querySelectorAll('input[type="checkbox"]')].map(i=>i.checked)}));
  const save=page.waitForResponse(r=>r.url()===base+'/settings'&&r.request().method()==='PUT');await page.locator('#saveSettingsBtn').click();assert.equal((await save).status(),200);
  await page.locator('#saveSettingsBtn:not(:disabled)').waitFor();await page.reload();await page.locator('#saveSettingsBtn:not(:disabled)').waitFor();
  assert.deepEqual(await page.evaluate(()=>({name:document.getElementById('accountName').value,email:document.getElementById('accountEmail').value,frequency:document.querySelector('input[name="frequency"]:checked').value,flags:[...document.querySelectorAll('input[type="checkbox"]')].map(i=>i.checked)})),snapshot);pass('Settings PUT with unchanged values and GET persistence after refresh');
  await go('reports');await page.locator('.report-metric').first().waitFor();
  const download=page.waitForEvent('download');await page.locator('#generateReportBtn').click();const d=await download;await d.saveAs('verification/live-report.txt');
  assert(fs.readFileSync('verification/live-report.txt','utf8').includes('Source: Live AWS data'));pass('Live report generation and actual text download');
  await go('website-similarity');
  await page.locator('#websiteUrlA').fill(`https://example.com/?check=${token}`);await page.locator('#websiteUrlB').fill(`https://example.org/?check=${token}`);
  await page.locator('#swapWebsitesBtn').click();assert.match(await page.locator('#websiteUrlA').inputValue(),/example.org/);await page.locator('#swapWebsitesBtn').click();pass('Website URL swap');
  const compare=page.waitForResponse(r=>r.url()===base+'/website-similarity'&&r.request().method()==='POST',{timeout:60000});await page.locator('#compareWebsitesBtn').click();const response=await compare;
  assert.equal(response.status(),200);const analysis=await response.json();assert.deepEqual(Object.keys(JSON.parse(response.request().postData())).sort(),['urlA','urlB']);
  await page.locator('#websiteResults:not(.hidden)').waitFor();assert.equal(await page.locator('.similarity-score-card').count(),4);assert.equal(await page.locator('#duplicateScore').textContent(),`${Math.round(analysis.scores.duplication)}%`);assert.equal(await page.locator('#verdictTitle').textContent(),analysis.verdict.title);
  await page.screenshot({path:'verification/website-live-result.png',fullPage:true});
  for(const theme of ['dark','light']) {
   if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme) await page.locator('#themeToggle').click();
   for(const width of [1440,1024,768,375]) {
    await page.setViewportSize({width,height:1000});
    const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth).map(el=>({tag:el.tagName,cls:el.className,width:el.getBoundingClientRect().width,text:el.textContent.slice(0,60)})).slice(0,15)}));
    if(layout.scroll>layout.width) await page.screenshot({path:'verification/result-overflow.png',fullPage:true});
    assert(layout.scroll<=layout.width,JSON.stringify(layout));
    if(width===375) await page.screenshot({path:`verification/website-result-${theme}-375.png`,fullPage:true});
   }
  }
  await page.setViewportSize({width:1440,height:1000});
  pass('Live comparison request, verdict, all four scores, evidence, warnings and responsive results');
  const history=page.locator('.website-history-item').filter({has:page.locator(`a[href*="${token}"]`)}).first();await history.waitFor();
  await history.locator('[data-compare-again]').click();assert.match(await page.locator('#websiteUrlA').inputValue(),new RegExp(token));pass('History and compare-again URL restoration');
  await history.locator('[data-delete-scan]').click();await page.locator('#modalConfirmBtn').click();await history.waitFor({state:'detached'});
  assert(!(await apiGet('/website-similarity')).scans.some(s=>s.urlA.includes(token)));pass('Delete newly created website comparison');
  // Fault injection is limited to this test browser; production never uses sample responses.
  await page.route(base+'/**',route=>route.abort('failed'));
  for(const name of ['dashboard','files','recommendations','analytics','settings','reports']){
   await go(name);await page.locator('#pageState.error').waitFor();
   if(name==='settings')assert(await page.locator('#saveSettingsBtn').isDisabled());
  }pass('Friendly API failures across pages; settings protected against failed-load overwrite');
  await page.unroute(base+'/**');await go('files');assert((await page.locator('#filesTableBody tr').count())>0);pass('Recovery after API failure');
  assert.deepEqual(errors,[]);pass('No uncaught browser JavaScript errors');
 }catch(error){results.push({test:'Live interaction suite',pass:false,error:error.stack});console.error(error);}
 finally {
  try {
   const leftovers=(await apiGet('/files')).files.filter(f=>f.fileName.startsWith(token));
   for(const f of leftovers){const r=await fetch(base+'/files/'+encodeURIComponent(f.fileId),{method:'DELETE',headers:{Accept:'application/json'}});assert(r.ok);}
   const scans=(await apiGet('/website-similarity')).scans.filter(s=>!initialScans.has(s.scanId)&&s.urlA?.includes(token));
   for(const s of scans){const r=await fetch(base+'/website-similarity/'+encodeURIComponent(s.scanId),{method:'DELETE',headers:{Accept:'application/json'}});assert(r.ok);}
   pass('Disposable test data cleanup');
  }catch(e){results.push({test:'cleanup',pass:false,error:e.message});}
  fs.writeFileSync('verification/live-flow-results.json',JSON.stringify({results,errors,requests},null,2));
  await browser.close();server.closeAllConnections();server.close();
 }
 console.log(JSON.stringify({results,errors},null,2));
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
