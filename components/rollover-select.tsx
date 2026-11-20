import { cn } from "@/lib/utils"
import { FieldError, errorInputClass } from "@/components/form-errors"
import { ROLLOVER_HELP, ROLLOVER_LABEL, ROLLOVER_NONE_LABEL } from "@/lib/ticket-rollover"

const CHEVRON =
  "appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3cpath%20fill%3D%22%23666%22%20d%3D%22M10.293%203.293L6%207.586%201.707%203.293A1%201%200%2000.293%204.707l5%205a1%201%200%20001.414%200l5-5a1%201%200%2010-1.414-1.414z%22%2F%3E%3c%2Fsvg%3E')] bg-[length:1rem] bg-no-repeat"

/**
 * "Opens after": the ticket this one waits for before it goes on sale. The
 * value is the predecessor's key as a string, "" for none. `size` follows the
 * surrounding form — the compact ticket cards or the larger modals.
 */
export function RolloverSelect({
  value,
  options,
  onChange,
  error,
  size = "sm",
}: {
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  error?: string
  size?: "sm" | "lg"
}) {
  return (
    <div>
      <label className={size === "lg" ? "text-sm font-medium mb-2 block" : "text-xs font-medium mb-1.5 block"}>
        {ROLLOVER_LABEL}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full border border-border bg-background text-sm outline-none focus:border-brand transition-all",
          CHEVRON,
          size === "lg"
            ? "h-12 px-4 pr-12 rounded-xl focus:ring-4 focus:ring-brand/25 bg-[center_right_1rem]"
            : "h-10 px-3 pr-10 rounded-lg focus:ring-2 focus:ring-brand/25 bg-[center_right_0.75rem]",
          error && errorInputClass
        )}
      >
        <option value="">{ROLLOVER_NONE_LABEL}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError message={error} />
      <p className="text-xs text-muted-foreground mt-1">{ROLLOVER_HELP}</p>
    </div>
  )
}
