import { AlertTriangle } from "lucide-react"

/** Added to an input's classes while it has an error. */
export const errorInputClass = "border-red-500 focus:border-red-500 focus:ring-red-500/25"

export type FieldErrors = Record<string, string>

/** The reason a single input was rejected, shown directly beneath it. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p data-field-error className="text-xs text-red-500 mt-1.5">{message}</p>
}

/** A failure that isn't about any one input: permissions, the API being down. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div data-field-error className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-red-800 dark:text-red-300">{message}</p>
    </div>
  )
}
