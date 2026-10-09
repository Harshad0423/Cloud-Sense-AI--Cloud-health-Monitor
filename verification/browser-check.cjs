const { chromium } = require('C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve('frontend');
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/dashboard.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css'})[file.split('.').pop()]||'application/octet-stream');res.end(data);});
});
const results=[],errors=[],requests=[];
async function main(){
  await new Promise(r=>server.listen(5500,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('execute-api'))requests.push({url:r.url(),method:r.request().method(),status:r.status()});});
  const pages=['dashboard','files','website-similarity','recommendations','analytics','reports','settings','index'];
  try {
    for(const name of pages){
      await page.goto(`http://127.0.0.1:5500/${name}.html`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);
      const state=await page.locator('#pageState').textContent().catch(()=>null);
      results.push({test:`${name} live load`,state});
      for(const theme of ['dark','light']){
        if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme) await page.locator('#themeToggle').click();
        for(const width of [1440,1024,768,375]){
          await page.setViewportSize({width,height:1000});
          const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
          results.push({test:`${name} ${theme} ${width} no overflow`,pass:!overflow});
          if(width===1440 || width===375) await page.screenshot({path:`verification/${name}-${theme}-${width}.png`,fullPage:true});
        }
      }
    }
  } finally {
    fs.writeFileSync('verification/browser-results.json',JSON.stringify({results,errors,requests},null,2));
    await browser.close(); server.closeAllConnections(); server.close();
  }
  console.log(JSON.stringify({checks:results.length,failures:results.filter(x=>x.pass===false),errors,requests},null,2));
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
