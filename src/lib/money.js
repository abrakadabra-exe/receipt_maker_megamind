export function fmtMoney(n) {
  const v = Number(n) || 0
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function bdt(n) {
  return `BDT ${fmtMoney(n)}`
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function belowHundred(n) {
  if (n < 20) return ONES[n]
  const t = Math.floor(n / 10)
  const o = n % 10
  return TENS[t] + (o ? ` ${ONES[o]}` : '')
}

function belowThousand(n) {
  const h = Math.floor(n / 100)
  const r = n % 100
  let out = ''
  if (h) out += `${ONES[h]} Hundred`
  if (r) out += (out ? ' ' : '') + belowHundred(r)
  return out || 'Zero'
}

export function amountInWords(n) {
  const v = Number(n) || 0
  const taka = Math.floor(v)
  const paisa = Math.round((v - taka) * 100)
  const crore = Math.floor(taka / 10000000)
  const lakh = Math.floor((taka % 10000000) / 100000)
  const thousand = Math.floor((taka % 100000) / 1000)
  const rest = taka % 1000

  const parts = []
  if (crore) parts.push(`${belowHundred(crore)} Crore`)
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`)
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`)
  if (rest) parts.push(belowThousand(rest))
  if (!parts.length) parts.push('Zero')

  let out = `${parts.join(' ')} Taka`
  if (paisa) out += ` and ${belowHundred(paisa)} Paisa`
  return out + ' Only'
}