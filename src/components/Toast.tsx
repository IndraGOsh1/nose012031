'use client'
import { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  msg: string
  type?: ToastType
  onClose: () => void
  duration?: number
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-green-900/40 border-green-700 text-green-300',
  error: 'bg-red-900/40 border-red-700 text-red-300',
  info: 'bg-blue-900/40 border-blue-700 text-blue-300',
  warning: 'bg-yellow-900/40 border-yellow-700 text-yellow-300',
}

const TOAST_ICONS: Record<ToastType, any> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
}

export function Toast({ msg, type = 'success', onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [onClose, duration])

  const Icon = TOAST_ICONS[type]

  return (
    <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 border font-mono text-xs transition-all ${TOAST_STYLES[type]}`}>
      <Icon size={13} className="shrink-0" />
      <span>{msg}</span>
    </div>
  )
}
