export const TYPES = [
  { id: 'service', label: 'Service Invoice', prefix: 'LN', blurb: 'Services rendered' },
  { id: 'product', label: 'Product Sale Invoice', prefix: 'PN', blurb: 'Products sold with warranty' },
  { id: 'repair', label: 'Repair Service Invoice', prefix: 'RN', blurb: 'Repairs, labour & parts' },
]

export function typeMeta(id) {
  return TYPES.find((t) => t.id === id) || TYPES[0]
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomToken(n) {
  const bytes = crypto.getRandomValues(new Uint8Array(n))
  let out = ''
  for (let i = 0; i < n; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}

export function generateNumber(type) {
  const { prefix } = typeMeta(type)
  return `${prefix}-${randomToken(6)}`
}