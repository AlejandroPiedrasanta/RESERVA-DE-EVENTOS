import re, sys, time
from playwright.sync_api import sync_playwright

def base_url():
    with open('/app/frontend/.env') as f:
        for line in f:
            m = re.match(r'REACT_APP_BACKEND_URL=(.*)', line.strip())
            if m:
                return m.group(1).strip().rstrip('/')
    sys.exit('no url')

URL = base_url()
TOKEN = open('/tmp/cap_token.txt').read().strip()
OUT = '/app/docs/screenshots'

pages = [
    ('/dashboard', 'dashboard.png'),
    ('/calendario', 'calendario.png'),
    ('/socios', 'socios.png'),
]

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    )
    ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
    # inject auth token before any app script runs
    ctx.add_init_script(f"try{{localStorage.setItem('cp_session_token','{TOKEN}');}}catch(e){{}}")
    page = ctx.new_page()
    # prime origin so localStorage init applies
    page.goto(URL, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(2000)
    for path, fname in pages:
        page.goto(URL + path, wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(4000)
        page.screenshot(path=f'{OUT}/{fname}', full_page=False,
                        animations='disabled', caret='hide', timeout=60000)
        body = page.inner_text('body')[:120].replace('\n', ' ')
        print(f'{fname}: url={page.url} len={len(page.inner_text("body"))} snip="{body}"')
    browser.close()
print('DONE')
