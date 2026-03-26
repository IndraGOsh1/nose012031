'use client'

export interface UiConfirmOptions {
  title?: string
  confirmText?: string
  cancelText?: string
  tone?: 'danger' | 'neutral'
}

export interface UiPromptOptions extends UiConfirmOptions {
  placeholder?: string
  defaultValue?: string
}

type ConfirmDetail = {
  message: string
  options?: UiConfirmOptions
  resolve: (accepted: boolean) => void
}

type AlertDetail = {
  message: string
  title?: string
}

type PromptDetail = {
  message: string
  options?: UiPromptOptions
  resolve: (value: string | null) => void
}

const CONFIRM_EVENT = 'fib:ui-confirm'
const ALERT_EVENT = 'fib:ui-alert'
const PROMPT_EVENT = 'fib:ui-prompt'

export function uiConfirm(message: string, options?: UiConfirmOptions): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    const detail: ConfirmDetail = { message, options, resolve }
    window.dispatchEvent(new CustomEvent(CONFIRM_EVENT, { detail }))
  })
}

export function uiAlert(message: string, title?: string) {
  if (typeof window === 'undefined') return
  const detail: AlertDetail = { message, title }
  window.dispatchEvent(new CustomEvent(ALERT_EVENT, { detail }))
}

export function uiPrompt(message: string, options?: UiPromptOptions): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  return new Promise<string | null>((resolve) => {
    const detail: PromptDetail = { message, options, resolve }
    window.dispatchEvent(new CustomEvent(PROMPT_EVENT, { detail }))
  })
}

export const uiDialogEvents = {
  CONFIRM_EVENT,
  ALERT_EVENT,
  PROMPT_EVENT,
}
