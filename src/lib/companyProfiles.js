import megamindWhite from '../assets/megamind-logo-white.png'
import safatLogo from '../assets/safat-logo.png'
import { backend } from './store'

export const DEFAULT_PROFILES = {
  service: {
    phone: '+880199289339',
    email: 'megamindbd.official@gmail.com',
    logo: '',
    logoOnDark: true,
  },
  product: {
    phone: '+880199289339',
    email: 'safatenterprise@gmail.com',
    logo: '',
    logoOnDark: true,
  },
  repair: {
    phone: '+880199289339',
    email: 'megamindbd.official@gmail.com',
    logo: '',
    logoOnDark: true,
  },
}

const DEFAULT_LOGO_SRC = {
  service: megamindWhite,
  product: safatLogo,
  repair: megamindWhite,
}

export async function getCompanyProfiles() {
  try {
    return (await backend.getCompanyProfiles()) || {}
  } catch {
    return {}
  }
}

export async function saveCompanyProfile(type, data) {
  await backend.saveCompanyProfile(type, {
    phone: (data.phone || '').trim(),
    email: (data.email || '').trim(),
    logo: data.logo || '',
    logoOnDark: !!data.logoOnDark,
  })
}

export async function resolveCompanyProfile(type) {
  const stored = (await getCompanyProfiles())[type] || {}
  const def = DEFAULT_PROFILES[type] || DEFAULT_PROFILES.service
  const logo = stored.logo || ''
  return {
    phone: stored.phone || def.phone,
    email: stored.email || def.email,
    logoSrc: logo ? logo : DEFAULT_LOGO_SRC[type],
    logoOnDark: logo ? !!stored.logoOnDark : def.logoOnDark,
  }
}

export function analyzeLogo(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 600
      const scale = Math.min(1, MAX / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let lum = 0
      let count = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 25) continue
        lum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        count++
      }
      const avg = count ? lum / count / 255 : 1
      resolve({ dataUrl: canvas.toDataURL('image/png'), logoOnDark: avg > 0.85 })
    }
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = dataUrl
  })
}