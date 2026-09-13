"""Desktop functional and visual evidence, not a claim about human-rated quality."""
from playwright.sync_api import sync_playwright
import json, pathlib, time, subprocess, atexit, urllib.request, os
root = pathlib.Path(__file__).resolve().parents[1]
out = root / 'outputs/browser'
out.mkdir(parents=True, exist_ok=True)
server_log = (out/'server.log').open('w')
server = subprocess.Popen(['npm','run','preview'], cwd=root, stdout=server_log, stderr=subprocess.STDOUT)
atexit.register(server.terminate)
for attempt in range(100):
    try:
        urllib.request.urlopen('http://127.0.0.1:5180/', timeout=1).close()
        break
    except Exception:
        time.sleep(.1)
else:
    raise RuntimeError('Preview server did not start')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('ARENA_CHROMIUM'), headless=True, args=['--no-sandbox','--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width':1440,'height':1000}, device_scale_factor=1)
    errors, failed = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('requestfailed', lambda r: failed.append({'url':r.url,'error':r.failure}))
    page.goto('http://127.0.0.1:5180/', wait_until='networkidle', timeout=20000)
    page.wait_for_function("document.getElementById('start').disabled === false", timeout=20000)
    page.screenshot(path=str(out/'ready.png'), full_page=True)
    page.click('#lab-toggle')
    frozen = []
    for kind in ['cut_right','cut_left','overhead','thrust','low_cut']:
        page.select_option('#lab-technique', kind)
        for phase in ['windup','swing','recover']:
            page.select_option('#lab-phase', phase)
            page.click('#lab-run')
            page.wait_for_function("document.body.dataset.labRunning==='false'", timeout=30000)
            tick = page.get_attribute('body','data-tick')
            page.wait_for_timeout(150)
            assert page.get_attribute('body','data-tick') == tick, 'Laboratory freeze must stop on a physics tick'
            frozen.append({'technique':kind,'requestedPhase':phase,'tick':int(tick),'state':page.locator('#state-a').inner_text()})
            page.screenshot(path=str(out/f'lab-{kind}-{phase}.png'), full_page=True)
    page.click('#start')
    page.wait_for_function('Number(document.body.dataset.tick)>360', timeout=30000)
    assert page.locator('aside').is_hidden(), 'Design controls must not occupy the fighting view'
    page.screenshot(path=str(out/'fighting.png'), full_page=True)
    page.click('#pause')
    page.wait_for_timeout(150)
    tick = page.get_attribute('body','data-tick')
    page.wait_for_timeout(200)
    assert page.get_attribute('body','data-tick') == tick
    page.click('#pause')
    page.wait_for_function("document.body.dataset.phase==='completed'", timeout=150000)
    page.wait_for_timeout(2000)
    page.screenshot(path=str(out/'finished.png'), full_page=True)
    with page.expect_download() as d:
        page.click('#export')
    d.value.save_as(str(out/'ui-match.json'))
    page.click('#replay')
    page.wait_for_timeout(300)
    assert page.locator('#mode').inner_text() == 'REPLAY'
    page.locator('#seek').press('Home')
    for _ in range(60):
        page.locator('#seek').press('ArrowRight')
    page.wait_for_timeout(150)
    assert page.locator('#clock').inner_text() == '02.00'
    page.screenshot(path=str(out/'replay.png'), full_page=True)
    page.click('#cinema')
    page.screenshot(path=str(out/'clean.png'), full_page=True)
    page.keyboard.press('Escape')
    page.set_viewport_size({'width':1100,'height':800})
    page.wait_for_timeout(250)
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), 'Desktop window overflow'
    page.screenshot(path=str(out/'desktop-1100.png'), full_page=True)
    report={'errors':errors,'failedRequests':failed,'fpsText':page.locator('#performance').inner_text(),
            'result':page.locator('#result').inner_text(),'pauseStable':True,'replaySeek':True,
            'desktopOnly':True,'actionLab':5,'frozenPhases':frozen,'fightHidesWorkbench':True,'desktopNoOverflow':True}
    (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print(json.dumps(report,ensure_ascii=False,indent=2))
    browser.close()
    assert not errors, errors
    assert not failed, failed
