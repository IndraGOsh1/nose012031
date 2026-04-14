function tryBase64Decode(value: string): string {
  try {
    return Buffer.from(value, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

export function getSecret(name: string, allowBase64Alias = true): string {
  const direct = process.env[name]
  if (direct && direct.trim()) return direct.trim()

  if (allowBase64Alias) {
    const b64 = process.env[`${name}_B64`]
    if (b64 && b64.trim()) {
      const decoded = tryBase64Decode(b64.trim())
      if (decoded.trim()) return decoded.trim()
    }
  }

  return ''
}

export function maskSecret(value: string): string {
  if (!value) return ''
  if (value.length <= 8) return '********'
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}