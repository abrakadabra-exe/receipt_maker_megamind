import { firefox } from 'playwright'

const BASE = 'http://localhost:4173/'
const EMAIL = `boss-${Date.now()}@megamindbd.test`
const PASSWORD = 'TestPass123!'
const NEW_PASSWORD = 'NewPass456!'

const results = []
function log(name, ok, extra = '') {
  results.push({ name, ok, extra })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`)
}

const browser = await firefox.launch()
const ctx = await browser.newContext({ acceptDownloads: true })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
const fs = await import('node:fs')

function field(label, row = 0) {
  return page.locator('label', { hasText: label }).nth(row).locator('input, select')
}

async function fillItem(row, { desc, qty, price, cost, tax, warranty = null, kind = null }) {
  if (kind) await field('Type', row).selectOption(kind)
  if (desc) await field('Description', row).fill(desc)
  if (warranty) await field('Warranty', row).fill(warranty)
  if (qty) await field('Qty', row).fill(qty)
  if (price) await field('Unit price', row).fill(price)
  if (cost) await field('Cost price', row).fill(cost)
  if (tax) await field('Tax %', row).fill(tax)
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForSelector('text=Create account', { timeout: 15000 })
  log('app loads', true)

  await page.click('text=Create account')
  await page.fill('input[type=email]', EMAIL)
  await page.fill('input[type=password]', PASSWORD)
  await page.fill('input[autocomplete="new-password"] >> nth=1', PASSWORD)
  await page.click('button[type=submit]')
  await page.waitForSelector('text=Save your recovery phrase', { timeout: 20000 })
  const phrase = (await page.locator('.font-mono').innerText()).trim()
  log('signup + recovery phrase shown', phrase.length > 20, phrase.slice(0, 12) + '…')
  await page.click('text=I saved it')

  await page.waitForSelector('text=Welcome back', { timeout: 10000 })
  log('dashboard visible', true)

  /* -------- Service invoice -------- */
  await page.click('text=Service Invoice')
  await page.waitForSelector('text=Service Invoice')
  await page.fill('input[placeholder*="Doctor"]', 'Test Client Ltd')
  await page.fill('input[placeholder*="+880"]', '+8801711111111')
  await page.fill('input[placeholder="Optional"]', 'Dhaka, Bangladesh')
  await field('Payment method').selectOption('bKash')
  await page.fill('input[placeholder*="Payment terms"]', 'Due on receipt')
  await fillItem(0, { desc: 'FB BOOST 7 DAYS', qty: '1', price: '3020', cost: '2000', tax: '5' })

  const grand = await page.locator('div.bg-orange-500').innerText()
  log('totals computed', grand.includes('3,171.00'), grand.replace(/\n/g, ' | '))

  await page.click('button:has-text("Preview PDF")')
  let previewOk = false
  const iframe = page.locator('iframe[title="Invoice preview"]')
  for (let i = 0; i < 40; i++) {
    const src = await iframe.getAttribute('src').catch(() => null)
    if (src && src.startsWith('blob:')) { previewOk = true; break }
    await page.waitForTimeout(500)
  }
  log('preview opens PDF', previewOk)
  await page.locator('button:has-text("Close")').click()

  await page.click('button:has-text("Save invoice")')
  await page.waitForSelector('text=Invoice saved', { timeout: 40000 })
  const invNumber = (await page.locator('.font-mono.text-2xl').innerText()).trim()
  log('saved, number generated', /^(LN|PN|RN)-[A-Z2-9]{6}$/.test(invNumber), invNumber)

  const dlPromise = page.waitForEvent('download', { timeout: 40000 })
  await page.click('button:has-text("Download")')
  const dl = await dlPromise
  const buf = fs.readFileSync(await dl.path())
  log('downloaded PDF valid', buf.length > 1000 && buf.subarray(0, 5).toString() === '%PDF-', `${buf.length} bytes`)

  /* -------- Product invoice (warranty, via header dropdown) -------- */
  await page.click('button:has-text("New invoice")')
  await page.waitForTimeout(300)
  const ddOpen = await page.locator('header [role="menu"] a').count()
  log('new invoice dropdown opens', ddOpen === 3, `items = ${ddOpen}`)
  await page.locator('header [role="menu"] a', { hasText: 'Product Sale' }).click()
  await page.waitForSelector('text=Product Sale Invoice')
  await page.fill('input[placeholder*="Doctor"]', 'Retail Client')
  await fillItem(0, { desc: 'Laptop 14" 8GB', qty: '2', price: '50000', cost: '35000', tax: '0', warranty: '1 year' })
  const pTotal = await page.locator('div.bg-orange-500').innerText()
  log('product totals (2×50000)', pTotal.includes('100,000.00'), pTotal.replace(/\n/g, ' | '))
  await page.click('button:has-text("Save invoice")')
  await page.waitForSelector('text=Invoice saved', { timeout: 40000 })
  const prodNumber = (await page.locator('.font-mono.text-2xl').innerText()).trim()
  log('product invoice saved', prodNumber.startsWith('PN-'), prodNumber)

  /* -------- Repair invoice (via header dropdown) -------- */
  await page.locator('header button[aria-haspopup="menu"]').click()
  await page.waitForTimeout(300)
  const ddItems = await page.locator('header [role="menu"] a').count()
  log('new invoice dropdown has 3 options', ddItems === 3, `items = ${ddItems}`)
  await page.locator('header [role="menu"] a', { hasText: 'Repair' }).click()
  await page.waitForSelector('text=Repair Service Invoice')
  await page.fill('input[placeholder*="Doctor"]', 'Walk-in Client')
  await page.fill('input[placeholder*="HP ProBook"]', 'HP ProBook 450 G8')
  await page.fill('input[placeholder*="Screen flickering"]', 'No display')
  await page.fill('textarea[placeholder*="Replaced display"]', 'Replaced display panel')
  await fillItem(0, { kind: 'labour', desc: 'Labour charge', qty: '1', price: '1500', cost: '1200', tax: '0' })
  await page.click('button:has-text("Add item")')
  await fillItem(1, { kind: 'parts', desc: 'Display panel', qty: '1', price: '6500', cost: '4000', tax: '0' })
  const rTotal = await page.locator('div.bg-orange-500').innerText()
  log('repair totals (labour+parts)', rTotal.includes('8,000.00'), rTotal.replace(/\n/g, ' | '))
  await page.click('button:has-text("Save invoice")')
  await page.waitForSelector('text=Invoice saved', { timeout: 40000 })
  const repNumber = (await page.locator('.font-mono.text-2xl').innerText()).trim()
  log('repair invoice saved', repNumber.startsWith('RN-'), repNumber)

  /* -------- Search -------- */
  await page.click('text=Dashboard')
  await page.click('text=Search invoices')
  await page.waitForSelector('text=Search invoices')
  await page.waitForTimeout(1000)
  log('all invoices listed', (await page.locator('.font-mono.text-sm').count()) === 3)

  await page.fill('input[placeholder*="LN-K7QX92"]', invNumber.slice(3, 7))
  await page.click('button:has-text("Search")')
  await page.waitForTimeout(800)
  log('search by number substring', (await page.locator('.font-mono.text-sm').count()) === 1, invNumber)

  await page.fill('input[placeholder*="LN-K7QX92"]', '')
  const today = new Date().toISOString().slice(0, 10)
  await page.fill('input[type=date] >> nth=0', today)
  await page.fill('input[type=date] >> nth=1', today)
  await page.click('button:has-text("Search")')
  await page.waitForTimeout(800)
  log('search by date range', (await page.locator('.font-mono.text-sm').count()) === 3)

  await page.fill('input[type=date] >> nth=0', '')
  await page.fill('input[type=date] >> nth=1', '')
  await page.click('button:has-text("Search")')
  await page.waitForTimeout(800)
  const dl2Promise = page.waitForEvent('download', { timeout: 40000 })
  await page.locator('button:has-text("PDF")').first().click()
  const dl2 = await dl2Promise
  const buf2 = fs.readFileSync(await dl2.path())
  log('search → PDF download decrypts', buf2.subarray(0, 5).toString() === '%PDF-')

  page.once('dialog', (d) => d.accept())
  await page.locator('button:has-text("Delete")').first().click()
  await page.waitForTimeout(800)
  log('delete works', (await page.locator('.font-mono.text-sm').count()) === 2)

  /* -------- Earnings -------- */
  await page.click('text=Dashboard')
  await page.click('header a:has-text("Earnings")')
  await page.waitForTimeout(1000)
  const totalRow = await page.locator('tfoot').innerText()
  const totalsOk =
    totalRow.includes('103,171.00') &&
    totalRow.includes('72,000.00') &&
    totalRow.includes('31,171.00')
  log(
    'earnings totals (rev/cost/profit)',
    totalsOk,
    totalRow.replace(/\n/g, ' | '),
  )
  await page.locator('tbody tr').first().click()
  await page.waitForTimeout(500)
  log('month drill-down shows invoices', (await page.locator('tbody .font-mono').count()) === 2)

  /* -------- Settings: change password -------- */
  await page.click('text=Settings')
  await page.waitForSelector('text=Change password')
  await page.fill('input[type=password] >> nth=0', PASSWORD)
  await page.fill('input[type=password] >> nth=1', NEW_PASSWORD)
  await page.fill('input[type=password] >> nth=2', NEW_PASSWORD)
  await page.click('button:has-text("Change password")')
  await page.waitForSelector('text=Password changed', { timeout: 20000 })
  log('password change rewraps key', true)

  /* -------- Logout → login with new password -------- */
  await page.click('text=Logout')
  await page.waitForSelector('text=Sign in')
  await page.fill('input[type=email]', EMAIL)
  await page.fill('input[type=password]', NEW_PASSWORD)
  await page.click('button[type=submit]')
  await page.waitForSelector('text=Welcome back', { timeout: 20000 })
  await page.click('text=Search invoices')
  await page.waitForTimeout(1000)
  log('relogin with new password, invoices listed', (await page.locator('.font-mono.text-sm').count()) === 2)

  /* -------- Reload → unlock flow -------- */
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('text=Unlock your invoices', { timeout: 15000 })
  await page.fill('input[type=password]', NEW_PASSWORD)
  await page.click('button:has-text("Unlock")')
  await page.waitForSelector('text=Welcome back', { timeout: 15000 })
  log('unlock screen after reload', true)

  /* -------- Mobile: hamburger + submenu -------- */
  await page.setViewportSize({ width: 375, height: 667 })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForSelector('text=Unlock your invoices', { timeout: 15000 })
  await page.fill('input[type=password]', NEW_PASSWORD)
  await page.click('button:has-text("Unlock")')
  await page.waitForSelector('text=Welcome back', { timeout: 15000 })
  const hamburger = page.locator('header button[aria-label="Menu"]')
  log('mobile hamburger visible', await hamburger.isVisible())
  await hamburger.click()
  const mobileNav = page.locator('header nav:visible')
  await mobileNav.getByText('New Invoice').click()
  await page.waitForTimeout(400)
  await mobileNav.getByText('Repair', { exact: true }).click()
  await page.waitForSelector('text=Repair Service Invoice', { timeout: 10000 })
  log('mobile submenu navigates to repair form', true)

  /* -------- Cleanup: delete the two remaining test invoices -------- */
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.locator('header a', { hasText: 'Search' }).first().click()
  await page.waitForSelector('button:has-text("Delete")', { timeout: 10000 })
  for (let i = 0; i < 2; i++) {
    await page.click('text=Search invoices')
    await page.waitForSelector('button:has-text("Delete")', { timeout: 10000 })
    page.once('dialog', (d) => d.accept())
    await page.locator('button:has-text("Delete")').first().click()
    await page.waitForTimeout(800)
  }
  await page.click('text=Search invoices')
  await page.waitForTimeout(800)
  log('cleanup deletes test invoices', (await page.locator('.font-mono.text-sm').count()) === 0)
} catch (err) {
  log('SCRIPT ERROR', false, err.message)
  try {
    console.log('BODY DUMP:', (await page.locator('body').innerText()).slice(0, 500).replace(/\n/g, ' | '))
  } catch { /* page gone */ }
  await page.screenshot({ path: '/tmp/opencode/fail.png', fullPage: true })
}

const realErrors = errors.filter((e) => !e.includes('React DevTools'))
log('no console/page errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)