function cleanToken(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 240)
}

export function sanitizeGoogleFormRef(raw: any): string {
  const value = String(raw || '').trim()
  if (!value) return ''

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      if (!/docs\.google\.com$/i.test(url.hostname)) return cleanToken(value)
      const match = url.pathname.match(/\/forms\/d(?:\/e)?\/([a-zA-Z0-9_-]+)/i)
      if (!match?.[1]) return value.slice(0, 2000)
      const token = cleanToken(match[1])
      if (url.pathname.includes('/d/e/')) {
        return `e:${token}`
      }
      return `d:${token}`
    } catch {
      return cleanToken(value)
    }
  }

  const token = cleanToken(value)
  if (!token) return ''
  return token.startsWith('1FAIp') ? `e:${token}` : `d:${token}`
}

export function buildGoogleFormUrls(raw: any) {
  const ref = sanitizeGoogleFormRef(raw)
  if (!ref) return { ref: '', embedUrl: '', openUrl: '', mode: 'none' as const }

  if (ref.startsWith('e:')) {
    const id = ref.slice(2)
    return {
      ref,
      embedUrl: `https://docs.google.com/forms/d/e/${id}/viewform?embedded=true`,
      openUrl: `https://docs.google.com/forms/d/e/${id}/viewform`,
      mode: 'embed' as const,
    }
  }

  if (ref.startsWith('d:')) {
    const id = ref.slice(2)
    return {
      ref,
      embedUrl: `https://docs.google.com/forms/d/${id}/viewform?embedded=true`,
      openUrl: `https://docs.google.com/forms/d/${id}/viewform`,
      mode: 'view' as const,
    }
  }

  const fallbackId = ref
  const legacyMode = fallbackId.startsWith('1FAIp') ? 'embed' : 'view'
  return legacyMode === 'embed'
    ? {
        ref: `e:${fallbackId}`,
        embedUrl: `https://docs.google.com/forms/d/e/${fallbackId}/viewform?embedded=true`,
        openUrl: `https://docs.google.com/forms/d/e/${fallbackId}/viewform`,
        mode: 'embed' as const,
      }
    : {
        ref: `d:${fallbackId}`,
        embedUrl: `https://docs.google.com/forms/d/${fallbackId}/viewform?embedded=true`,
        openUrl: `https://docs.google.com/forms/d/${fallbackId}/viewform`,
        mode: 'view' as const,
      }
}