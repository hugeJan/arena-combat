from playwright.sync_api import sync_playwright
import json,pathlib,time,subprocess,os,urllib.request
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'outputs/browser';out.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen(['npm','run','preview'],cwd=root,stdout=(out/'server.log').open('w'),stderr=subprocess.STDOUT)
import atexit
atexit.register(server.terminate)
for attempt in range(100):
 try:
  urllib.request.urlopen('http://127.0.0.1:5180/',timeout=1).close();break
 except Exception:time.sleep(.1)
else:raise RuntimeError('Preview server did not start')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':1040},device_scale_factor=1)
 errors=[];failed=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('requestfailed',lambda r:failed.append({'url':r.url,'error':r.failure}))
 page.goto('http://127.0.0.1:5180/',wait_until='networkidle',timeout=20000)
 page.wait_for_function("document.getElementById('start').disabled === false",timeout=15000)
 page.screenshot(path=str(out/'ready.png'),full_page=True)
 page.click('#start');page.wait_for_function("Number(document.body.dataset.tick)>600",timeout=30000)
 page.screenshot(path=str(out/'fighting.png'),full_page=True)
 page.click('#pause');page.wait_for_timeout(200);tick=page.get_attribute('body','data-tick');page.wait_for_timeout(250)
 assert page.get_attribute('body','data-tick')==tick
 page.click('#pause');page.wait_for_function("document.body.dataset.phase==='completed'",timeout=90000)
 page.screenshot(path=str(out/'finished.png'),full_page=True)
 with page.expect_download() as d:page.click('#export')
 d.value.save_as(str(out/'ui-match.json'))
 page.click('#replay');page.wait_for_timeout(600);assert page.locator('#mode').inner_text()=='REPLAY'
 page.locator('#seek').press('Home')
 for _ in range(60):page.locator('#seek').press('ArrowRight')
 page.wait_for_timeout(150)
 assert page.locator('#clock').inner_text()=='02.00'
 page.screenshot(path=str(out/'replay.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400);page.screenshot(path=str(out/'mobile.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
 report={'errors':errors,'failedRequests':failed,'fpsText':page.locator('#performance').inner_text(),'result':page.locator('#result').inner_text(),'pauseStable':True,'replaySeek':True,'mobileNoOverflow':True}
 (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps(report,ensure_ascii=False,indent=2));browser.close()
 assert not errors, errors
 assert not failed, failed
