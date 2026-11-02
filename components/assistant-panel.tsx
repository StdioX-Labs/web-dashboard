"use client"

import React, { useEffect, useRef, useState } from "react"
import type Anthropic from "@anthropic-ai/sdk"
import { Check, Loader2, Paperclip, RotateCcw, Send, Sparkles, X, AlertTriangle, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { sessionManager } from "@/lib/session-manager"
import { validateImageFile } from "@/lib/contabo-uploader"
import { runWrite, type WriteOutcome } from "@/lib/assistant/actions"
import { isWriteTool, summarizeAction, type PendingAction } from "@/lib/assistant/tools"

type MessageParam = Anthropic.Beta.BetaMessageParam
type ToolResult = Anthropic.Beta.BetaToolResultBlockParam

type ActionStatus = "waiting" | "running" | "done" | "failed" | "cancelled"

interface ActionState {
  action: PendingAction
  status: ActionStatus
  outcome?: WriteOutcome
}

interface ChatResponse {
  status: boolean
  message?: string
  messages?: MessageParam[]
  pending?: PendingAction[]
  heldResults?: ToolResult[]
  notice?: string
}

const READ_LABELS: Record<string, string> = {
  list_events: "Looked up your events",
  get_event: "Opened event details",
  list_attendees: "Checked attendees",
  list_transactions: "Checked transactions",
  list_promo_codes: "Checked promo codes",
  list_flash_sales: "Checked flash sales",
  list_affiliates: "Checked affiliates",
  list_users: "Checked your team",
}

const SUGGESTIONS = [
  "How are ticket sales going for my upcoming events?",
  "Who used a promo code on my last event?",
  "Create a 20% off promo code for this weekend",
  "Issue 2 complimentary tickets",
]

/** What goes back to the assistant once the organizer has decided on a write. */
function resultFor(state: ActionState): ToolResult {
  const id = state.action.toolUseId
  if (state.status === "cancelled") {
    return { type: "tool_result", tool_use_id: id, content: "The organizer cancelled this action. Nothing was changed." }
  }
  const outcome = state.outcome!
  if (outcome.ok) {
    return { type: "tool_result", tool_use_id: id, content: JSON.stringify({ result: "done", message: outcome.message, ...outcome.details }) }
  }
  return {
    type: "tool_result",
    tool_use_id: id,
    is_error: true,
    content: JSON.stringify({ result: "failed", apiMessage: outcome.message, ...outcome.details }),
  }
}

export default function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [transcript, setTranscript] = useState<MessageParam[]>([])
  const [actions, setActionsState] = useState<Record<string, ActionState>>({})
  // Decisions on several cards can overlap while a write is running, so each
  // update builds on the latest map rather than the one a click closed over.
  const actionsRef = useRef<Record<string, ActionState>>({})
  const setActions = (update: (prev: Record<string, ActionState>) => Record<string, ActionState>) => {
    actionsRef.current = update(actionsRef.current)
    setActionsState(actionsRef.current)
  }
  const [batch, setBatch] = useState<{ ids: string[]; held: ToolResult[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [poster, setPoster] = useState<File | null>(null)
  const [posterPreview, setPosterPreview] = useState<string | null>(null)
  const [announcedPoster, setAnnouncedPoster] = useState<File | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [transcript, actions, busy, error])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!poster) {
      setPosterPreview(null)
      return
    }
    const url = URL.createObjectURL(poster)
    setPosterPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [poster])

  const waitingOnOrganizer = batch !== null

  async function post(messages: MessageParam[]): Promise<boolean> {
    const user = sessionManager.getUser()
    if (!user) {
      setError("Your session has expired. Please sign in again.")
      return false
    }
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          session: {
            userId: user.user_id,
            companyId: user.company_id,
            companyName: user.company_name,
            currency: user.currency,
            email: user.email,
          },
        }),
      })
      let data: ChatResponse
      try {
        data = await response.json()
      } catch {
        data = { status: false, message: `The assistant is unavailable right now (${response.status}).` }
      }
      if (!response.ok || !data.status || !data.messages) {
        setError(data.message || "The assistant is unavailable right now. Please try again.")
        return false
      }
      setTranscript(data.messages)
      if (data.notice) setNotice(data.notice)
      if (data.pending && data.pending.length > 0) {
        const pending = data.pending
        setActions((prev) => {
          const next = { ...prev }
          for (const action of pending) next[action.toolUseId] = { action, status: "waiting" }
          return next
        })
        setBatch({ ids: pending.map((a) => a.toolUseId), held: data.heldResults ?? [] })
      }
      return true
    } catch {
      setError("Couldn't reach the assistant. Please check your connection and try again.")
      return false
    } finally {
      setBusy(false)
    }
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if ((!trimmed && poster === announcedPoster) || busy || waitingOnOrganizer) return
    let content = trimmed
    if (poster && poster !== announcedPoster) {
      content = `[I attached a poster image: ${poster.name}]${content ? `\n\n${content}` : ""}`
    }
    const previous = transcript
    const next: MessageParam[] = [...transcript, { role: "user", content }]
    setTranscript(next)
    setDraft("")
    const ok = await post(next)
    if (ok) {
      if (poster) setAnnouncedPoster(poster)
    } else {
      setTranscript(previous)
      setDraft(text)
    }
  }

  async function decide(id: string, confirm: boolean) {
    const state = actionsRef.current[id]
    if (!state || state.status !== "waiting" || !batch) return
    const user = sessionManager.getUser()
    if (confirm && !user) {
      setError("Your session has expired. Please sign in again.")
      return
    }

    let decided: ActionState
    if (confirm) {
      setActions((prev) => ({ ...prev, [id]: { ...state, status: "running" } }))
      const outcome = await runWrite(state.action, user!, poster)
      decided = { ...state, status: outcome.ok ? "done" : "failed", outcome }
    } else {
      decided = { ...state, status: "cancelled" }
    }

    setActions((prev) => ({ ...prev, [id]: decided }))
    const nextActions = actionsRef.current

    const states = batch.ids.map((batchId) => nextActions[batchId])
    if (states.some((s) => s.status === "waiting" || s.status === "running")) return

    const results = [...batch.held, ...states.map(resultFor)]
    setBatch(null)
    const next: MessageParam[] = [...transcript, { role: "user", content: results }]
    setTranscript(next)
    if (!(await post(next))) {
      // The decision stands; let the organizer ask again rather than lose it.
      setNotice("Your choice was recorded. Send a message to continue.")
    }
  }

  function pickPoster(file: File | undefined) {
    if (!file) return
    const check = validateImageFile(file)
    if (!check.valid) {
      setError(check.error || "That file can't be used as a poster")
      return
    }
    setError(null)
    setPoster(file)
  }

  function reset() {
    if (busy) return
    setTranscript([])
    setActions(() => ({}))
    setBatch(null)
    setError(null)
    setNotice(null)
    setPoster(null)
    setAnnouncedPoster(null)
  }

  const currency = sessionManager.getUser()?.currency || "KES"

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 h-12 pl-4 pr-5 rounded-full bg-brand text-white shadow-lg hover:bg-brand-hover transition-colors"
          aria-label="Open the assistant"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold">Assistant</span>
        </button>
      )}

      {open && (
        <aside
          className="fixed inset-y-0 right-0 z-50 flex w-full sm:w-[440px] flex-col border-l border-border bg-background shadow-2xl"
          aria-label="Assistant"
        >
          <header className="flex items-center justify-between gap-2 border-b border-border px-4 h-14 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-soft" />
              <h2 className="font-semibold text-foreground">Assistant</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                disabled={busy || transcript.length === 0}
                className="p-2 rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-40"
                title="New conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {transcript.length === 0 && (
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Ask about sales, attendees and promotions, or ask me to create events, promo codes, flash sales, teammates and
                  complimentary tickets. You confirm every change before it happens.
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full text-left text-sm px-3 py-2 rounded-xl border border-border hover:bg-secondary transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Transcript
              transcript={transcript}
              actions={actions}
              currency={currency}
              poster={posterPreview}
              hasPoster={poster !== null}
              onDecide={decide}
              disabled={busy}
            />

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
              </div>
            )}
            {notice && <p className="text-xs text-muted-foreground">{notice}</p>}
            {error && (
              <div className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <footer className="border-t border-border p-3 shrink-0 space-y-2">
            {poster && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {posterPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={posterPreview} alt="" className="w-10 h-10 rounded object-cover border border-border" />
                )}
                <span className="truncate flex-1">Poster: {poster.name}</span>
                <button onClick={() => { setPoster(null); setAnnouncedPoster(null) }} className="p-1 hover:text-foreground" title="Remove poster">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {waitingOnOrganizer && <p className="text-xs text-muted-foreground">Confirm or cancel the action above to continue.</p>}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(draft)
              }}
              className="flex items-end gap-2"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  pickPoster(e.target.files?.[0])
                  e.target.value = ""
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary"
                title="Attach an event poster"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    send(draft)
                  }
                }}
                rows={1}
                placeholder={waitingOnOrganizer ? "Waiting for your confirmation…" : "Ask or tell the assistant…"}
                disabled={waitingOnOrganizer}
                className="flex-1 resize-none max-h-32 min-h-10 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/25 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || waitingOnOrganizer || (!draft.trim() && poster === announcedPoster)}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-hover disabled:opacity-40"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </footer>
        </aside>
      )}
    </>
  )
}

function Transcript({
  transcript,
  actions,
  currency,
  poster,
  hasPoster,
  onDecide,
  disabled,
}: {
  transcript: MessageParam[]
  actions: Record<string, ActionState>
  currency: string
  poster: string | null
  hasPoster: boolean
  onDecide: (id: string, confirm: boolean) => void
  disabled: boolean
}) {
  const items: React.ReactNode[] = []
  let lastReadLabel: string | null = null

  transcript.forEach((message, m) => {
    if (typeof message.content === "string") {
      lastReadLabel = null
      items.push(<Bubble key={`m${m}`} role={message.role} text={message.content} />)
      return
    }
    (message.content ?? []).forEach((block, b) => {
      const key = `m${m}b${b}`
      if (block.type === "text" && block.text.trim()) {
        lastReadLabel = null
        items.push(<Bubble key={key} role={message.role} text={block.text} />)
      } else if (block.type === "tool_use") {
        if (isWriteTool(block.name)) {
          lastReadLabel = null
          const state = actions[block.id]
          if (state) {
            items.push(
              <ActionCard
                key={key}
                state={state}
                currency={currency}
                poster={poster}
                hasPoster={hasPoster}
                onDecide={onDecide}
                disabled={disabled}
              />
            )
          }
        } else {
          const label = READ_LABELS[block.name] ?? "Looked something up"
          if (label !== lastReadLabel) {
            items.push(
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Search className="w-3 h-3" /> {label}
              </div>
            )
          }
          lastReadLabel = label
        }
      }
    })
  })

  return <>{items}</>
}

function Bubble({ role, text }: { role: string; text: string }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand text-white px-3 py-2 text-sm whitespace-pre-wrap break-words">{text}</div>
      </div>
    )
  }
  return (
    <div className="w-full rounded-2xl rounded-bl-md bg-secondary px-3.5 py-3 text-sm text-foreground break-words">
      <Markdown text={text} />
    </div>
  )
}

function ActionCard({
  state,
  currency,
  poster,
  hasPoster,
  onDecide,
  disabled,
}: {
  state: ActionState
  currency: string
  poster: string | null
  hasPoster: boolean
  onDecide: (id: string, confirm: boolean) => void
  disabled: boolean
}) {
  const summary = summarizeAction(state.action, currency)
  const missingPoster = summary.needsPoster && !hasPoster
  const id = state.action.toolUseId

  return (
    <div
      className={cn(
        "rounded-2xl border p-3 space-y-3",
        state.status === "waiting" || state.status === "running" ? "border-brand bg-brand/5" : "border-border",
        state.status === "failed" && "border-destructive/50"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{summary.title}</h3>
        <StatusBadge status={state.status} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {summary.rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground break-words whitespace-pre-wrap line-clamp-4">{value}</dd>
          </React.Fragment>
        ))}
      </dl>

      {summary.lines && summary.lines.length > 0 && (
        <ul className="text-xs text-foreground space-y-0.5 border-t border-border pt-2">
          {summary.lines.map((line) => (
            <li key={line}>• {line}</li>
          ))}
        </ul>
      )}

      {summary.needsPoster && (
        <div className="flex items-center gap-2 text-xs">
          {poster ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster} alt="Poster" className="w-12 h-12 rounded object-cover border border-border" />
              <span className="text-muted-foreground">Poster from the chat</span>
            </>
          ) : (
            <span className="text-destructive">Attach a poster with the paperclip below before confirming.</span>
          )}
        </div>
      )}

      {state.outcome && (
        <p className={cn("text-xs", state.outcome.ok ? "text-muted-foreground" : "text-destructive")}>{state.outcome.message}</p>
      )}

      {state.status === "waiting" && (
        <div className="flex gap-2">
          <button
            onClick={() => onDecide(id, false)}
            disabled={disabled}
            className="flex-1 h-9 rounded-xl bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onDecide(id, true)}
            disabled={disabled || missingPoster}
            className="flex-1 h-9 rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ActionStatus }) {
  switch (status) {
    case "waiting":
      return <span className="text-[11px] font-medium text-brand-soft">Needs your confirmation</span>
    case "running":
      return <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Working…</span>
    case "done":
      return <span className="flex items-center gap-1 text-[11px] text-green-500"><Check className="w-3 h-3" /> Done</span>
    case "failed":
      return <span className="flex items-center gap-1 text-[11px] text-destructive"><AlertTriangle className="w-3 h-3" /> Failed</span>
    case "cancelled":
      return <span className="text-[11px] text-muted-foreground">Cancelled</span>
  }
}

// ---- A small Markdown subset: paragraphs, lists, tables, headings, bold, code ----

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i} className="px-1 rounded bg-background/60 text-[0.85em]">{part.slice(1, -1)}</code>
        return <React.Fragment key={i}>{part}</React.Fragment>
      })}
    </>
  )
}

// "1,050", "KES 46,110", "-12%", "20 / 100": figures that line up on the right
const NUMERIC_CELL = /^(?:[A-Z]{3}\s?)?[-+]?[\d,]+(?:\.\d+)?%?(?:\s*\/\s*[\d,]+)?$|^[-–—]$/
const LIST_LINE = /^\s*([-*•]|\d+\.)\s+/

function stripBold(cell: string) {
  return cell.replace(/^\*\*(.*)\*\*$/, "$1").trim()
}

function MarkdownTable({ rows }: { rows: string[][] }) {
  const [head = [], ...body] = rows
  const columns = Math.max(head.length, ...body.map((r) => r.length))
  const numeric = Array.from({ length: columns }, (_, j) => {
    const cells = body.map((r) => stripBold(r[j] ?? "")).filter(Boolean)
    return j > 0 && cells.length > 0 && cells.every((c) => NUMERIC_CELL.test(c))
  })
  const isTotal = (r: string[]) => /^(total|totals|all events|overall)\b/i.test(stripBold(r[0] ?? ""))
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-muted">
          <tr>
            {head.map((c, j) => (
              <th key={j} className={cn("px-2 py-1.5 font-medium text-muted-foreground whitespace-nowrap first:pl-2.5 last:pr-2.5", j === 0 && "sticky left-0 bg-muted", numeric[j] ? "text-right" : "text-left")}>
                <Inline text={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, k) => (
            <tr key={k} className={cn("border-t border-border", isTotal(r) ? "border-t-2 bg-muted font-semibold" : "bg-secondary")}>
              {Array.from({ length: columns }, (_, j) => (
                <td key={j} className={cn("px-2 py-1.5 whitespace-nowrap first:pl-2.5 last:pr-2.5", j === 0 && "sticky left-0 bg-inherit", numeric[j] && "text-right tabular-nums")}>
                  <Inline text={r[j] ?? ""} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// `:::stats Tickets sold = 46 | Revenue = KES 46,110` renders as a row of chips
function StatChips({ spec }: { spec: string }) {
  const stats = spec.split("|").map((part) => {
    const [label, ...rest] = part.split("=")
    return { label: label.trim(), value: rest.join("=").trim() }
  }).filter((s) => s.label && s.value)
  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((s, k) => (
        <div key={k} className="rounded-lg border border-border bg-background/40 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
          <div className="text-sm font-semibold tabular-nums"><Inline text={s.value} /></div>
        </div>
      ))}
    </div>
  )
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n")
  const blocks: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || /^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      i++
      continue
    }
    const stats = line.match(/^\s*:::stats\s+(.*)$/)
    if (stats) {
      blocks.push(<StatChips key={blocks.length} spec={stats[1]} />)
      i++
      continue
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      blocks.push(<MarkdownTable key={blocks.length} rows={rows} />)
      continue
    }
    if (LIST_LINE.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && LIST_LINE.test(lines[i])) {
        items.push(lines[i].replace(LIST_LINE, ""))
        i++
      }
      const List = ordered ? "ol" : "ul"
      blocks.push(
        <List key={blocks.length} className={cn("pl-5 space-y-1 marker:text-muted-foreground", ordered ? "list-decimal" : "list-disc")}>
          {items.map((it, k) => <li key={k}><Inline text={it} /></li>)}
        </List>
      )
      continue
    }
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      blocks.push(
        <h4 key={blocks.length} className={cn("text-[13px] font-semibold text-foreground", blocks.length > 0 && "pt-2 mt-1 border-t border-border/60")}>
          <Inline text={heading[1]} />
        </h4>
      )
      i++
      continue
    }
    const paragraph: string[] = []
    while (i < lines.length && lines[i].trim() && !/^\s*([-*•]|\d+\.)\s+|^\s*\||^#{1,6}\s|^\s*:::stats/.test(lines[i])) {
      paragraph.push(lines[i])
      i++
    }
    blocks.push(<p key={blocks.length} className="whitespace-pre-wrap leading-relaxed"><Inline text={paragraph.join("\n")} /></p>)
  }
  return <div className="space-y-2.5">{blocks}</div>
}
