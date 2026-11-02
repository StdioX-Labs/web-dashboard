"use client"

import React, { useEffect, useRef, useState } from "react"
import type Anthropic from "@anthropic-ai/sdk"
import { AnimatePresence, motion, MotionConfig } from "framer-motion"
import {
  Check, Loader2, Paperclip, RotateCcw, Send, Sparkles, X, AlertTriangle, Search,
  CalendarPlus, BarChart3, TrendingUp, TicketPercent, Gift, UserPlus, ChevronDown,
} from "lucide-react"
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

const TASKS = [
  { icon: CalendarPlus, title: "Create an event", hint: "Step by step, with a poster", prompt: "I want to create a new event. Walk me through it one step at a time." },
  { icon: BarChart3, title: "Event report", hint: "Sales, revenue, promos", prompt: "Give me a report on one of my events." },
  { icon: TrendingUp, title: "Ticket sales", hint: "How every event is doing", prompt: "How are ticket sales going across my events?" },
  { icon: TicketPercent, title: "Promo code", hint: "Discounts for an event", prompt: "I want to create a promo code." },
  { icon: Gift, title: "Complimentary tickets", hint: "Send free tickets", prompt: "I want to issue complimentary tickets." },
  { icon: UserPlus, title: "Add a teammate", hint: "Staff or co-owner", prompt: "I want to add a teammate to my company." },
]

// Shown above the input when the latest reply doesn't suggest its own next steps.
const DEFAULT_SUGGESTIONS = ["How are sales going?", "Create a promo code", "Event report", "Issue comps"]

// `:::suggest Show earlier events | Create a promo code` at the end of a reply
// becomes tappable chips above the input rather than part of the bubble.
const SUGGEST_LINE = /^\s*:::suggest\s+(.*)$/

function suggestionsFrom(transcript: MessageParam[]): string[] {
  const last = transcript[transcript.length - 1]
  if (!last || last.role !== "assistant") return []
  const text = typeof last.content === "string"
    ? last.content
    : (last.content ?? []).map((b) => (b.type === "text" ? b.text : "")).join("\n")
  const line = text.split("\n").map((l) => l.match(SUGGEST_LINE)).find(Boolean)
  if (line) return line[1].split("|").map((o) => o.trim()).filter(Boolean).slice(0, 4)
  // A reply that asks the organizer to pick something already has its buttons.
  return /^\s*:::choices\s/m.test(text) ? [] : DEFAULT_SUGGESTIONS
}

const ATTACH_POSTER = /^attach (a |the |your )?poster$/i

// Kept in step with the server, which rejects longer messages.
const MAX_MESSAGE_CHARS = 4000

// Shared entrance for transcript items: a short rise and fade.
const enter = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { type: "spring" as const, stiffness: 380, damping: 32 },
}

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
  const sendPosterOnPick = useRef(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [transcript, actions, busy, error])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [draft])

  // Esc closes the panel; the page behind it doesn't scroll on phones while it's open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    const small = window.matchMedia("(max-width: 639px)").matches
    const overflow = document.body.style.overflow
    if (small) document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = overflow
    }
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

  // `attached` lets a poster picked from an "Attach poster" choice go out
  // straight away, before the poster state has caught up.
  async function send(text: string, attached: File | null = poster) {
    const trimmed = text.trim()
    if ((!trimmed && attached === announcedPoster) || busy || waitingOnOrganizer) return
    let content = trimmed
    if (attached && attached !== announcedPoster) {
      content = `[I attached a poster image: ${attached.name}]${content ? `\n\n${content}` : ""}`
    }
    const previous = transcript
    const next: MessageParam[] = [...transcript, { role: "user", content }]
    setTranscript(next)
    setDraft("")
    const ok = await post(next)
    if (ok) {
      if (attached) setAnnouncedPoster(attached)
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

  function choose(choice: string) {
    if (ATTACH_POSTER.test(choice)) {
      sendPosterOnPick.current = true
      fileRef.current?.click()
      return
    }
    send(choice)
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
    if (sendPosterOnPick.current) {
      sendPosterOnPick.current = false
      send(draft, file)
    }
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

  const user = sessionManager.getUser()
  const currency = user?.currency || "KES"
  const greetingName = user?.company_name || "there"
  const suggestions = busy || waitingOnOrganizer ? [] : suggestionsFrom(transcript)

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            className="group fixed right-4 sm:right-5 z-40 flex items-center gap-2 h-12 pl-4 pr-5 rounded-full bg-brand text-white shadow-lg shadow-brand/30 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-5"
            aria-label="Open the assistant"
          >
            <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-20 pointer-events-none" />
            <motion.span
              className="relative"
              animate={{ rotate: [0, 14, -8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 4 }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.span>
            <span className="relative text-sm font-semibold">Assistant</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              key="panel"
              initial={{ x: "100%", opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.6 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-full sm:w-[440px] flex-col border-l border-border bg-background shadow-2xl"
              aria-label="Assistant"
            >
              <header className="relative flex items-center justify-between gap-2 border-b border-border px-4 h-14 shrink-0 pt-[env(safe-area-inset-top)] box-content">
                <div className="flex items-center gap-2.5">
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-soft/70 text-white"
                  >
                    <Sparkles className="w-4 h-4" />
                  </motion.div>
                  <div className="leading-tight">
                    <h2 className="font-semibold text-foreground text-sm">Assistant</h2>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {busy ? "Working on it…" : "You confirm every change"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={reset}
                    disabled={busy || transcript.length === 0}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 transition-colors"
                    title="New conversation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors" title="Close">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {busy && (
                  <div className="absolute -bottom-px left-0 h-px w-full overflow-hidden">
                    <motion.div
                      className="h-full w-1/3 bg-gradient-to-r from-transparent via-brand-soft to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{ x: "300%" }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-4 py-4 space-y-3">
                {transcript.length === 0 && (
                  <motion.div
                    className="space-y-5 pt-2"
                    initial="hidden"
                    animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } }}
                  >
                    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }} className="space-y-1">
                      <p className="text-lg font-semibold text-foreground">Hi {greetingName} 👋</p>
                      <p className="text-sm text-muted-foreground">
                        What would you like to do? Pick a task or just ask. Nothing changes until you confirm it.
                      </p>
                    </motion.div>
                    <div className="grid grid-cols-2 gap-2">
                      {TASKS.map((t) => (
                        <motion.button
                          key={t.title}
                          variants={{ hidden: { opacity: 0, y: 12, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1 } }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => send(t.prompt)}
                          className="group text-left rounded-xl border border-border bg-secondary/40 p-3 hover:border-brand/60 hover:bg-secondary transition-colors"
                        >
                          <t.icon className="w-4 h-4 text-brand-soft mb-2 transition-transform group-hover:scale-110" />
                          <div className="text-sm font-medium text-foreground leading-snug">{t.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.hint}</div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                <Transcript
                  transcript={transcript}
                  actions={actions}
                  currency={currency}
                  poster={posterPreview}
                  hasPoster={poster !== null}
                  onDecide={decide}
                  onChoose={choose}
                  disabled={busy}
                  canChoose={!busy && !waitingOnOrganizer}
                />

                <AnimatePresence>
                  {busy && (
                    <motion.div key="typing" {...enter} exit={{ opacity: 0 }} className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-secondary w-fit px-3.5 py-3">
                      {[0, 1, 2].map((d) => (
                        <motion.span
                          key={d}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                {notice && <motion.p {...enter} className="text-xs text-muted-foreground">{notice}</motion.p>}
                {error && (
                  <motion.div {...enter} className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              <footer className="border-t border-border px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0 space-y-2">
                <AnimatePresence>
                  {poster && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      {posterPreview && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={posterPreview} alt="" className="w-10 h-10 rounded object-cover border border-border" />
                      )}
                      <span className="truncate flex-1">Poster: {poster.name}</span>
                      <button onClick={() => { setPoster(null); setAnnouncedPoster(null) }} className="p-1 hover:text-foreground" title="Remove poster">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                {waitingOnOrganizer && <p className="text-xs text-muted-foreground">Confirm or cancel the action above to continue.</p>}
                <AnimatePresence mode="popLayout">
                  {suggestions.length > 0 && (
                    <motion.div
                      key={suggestions.join("|")}
                      className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, y: 6, transition: { duration: 0.12 } }}
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                    >
                      {suggestions.map((sug) => (
                        <motion.button
                          key={sug}
                          type="button"
                          variants={{ hidden: { opacity: 0, y: 8, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1 } }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => send(sug)}
                          className="shrink-0 whitespace-nowrap rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs text-foreground transition-colors hover:border-brand/60 hover:bg-brand/10"
                        >
                          {sug}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    className="h-11 w-11 sm:h-10 sm:w-10 shrink-0 flex items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    title="Attach an event poster"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={draft}
                    maxLength={MAX_MESSAGE_CHARS}
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
                    className="flex-1 resize-none max-h-32 min-h-11 sm:min-h-10 rounded-xl border border-border bg-background px-3 py-2.5 sm:py-2 text-base sm:text-sm outline-none transition-shadow focus:border-brand focus:ring-4 focus:ring-brand/25 disabled:opacity-60"
                  />
                  <motion.button
                    type="submit"
                    whileTap={{ scale: 0.9 }}
                    disabled={busy || waitingOnOrganizer || (!draft.trim() && poster === announcedPoster)}
                    className="h-11 w-11 sm:h-10 sm:w-10 shrink-0 flex items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-hover disabled:opacity-40 transition-colors"
                    title="Send"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </form>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </MotionConfig>
  )
}

function Transcript({
  transcript,
  actions,
  currency,
  poster,
  hasPoster,
  onDecide,
  onChoose,
  disabled,
  canChoose,
}: {
  transcript: MessageParam[]
  actions: Record<string, ActionState>
  currency: string
  poster: string | null
  hasPoster: boolean
  onDecide: (id: string, confirm: boolean) => void
  onChoose: (choice: string) => void
  disabled: boolean
  canChoose: boolean
}) {
  const items: React.ReactNode[] = []
  // Choice buttons only work on the latest reply; older ones are history.
  const lastAssistant = transcript.findLastIndex((m) => m.role === "assistant")
  let lastReadLabel: string | null = null

  transcript.forEach((message, m) => {
    if (typeof message.content === "string") {
      lastReadLabel = null
      items.push(<Bubble key={`m${m}`} role={message.role} text={message.content} onChoose={m === lastAssistant && canChoose ? onChoose : undefined} />)
      return
    }
    (message.content ?? []).forEach((block, b) => {
      const key = `m${m}b${b}`
      if (block.type === "text" && block.text.trim()) {
        lastReadLabel = null
        items.push(<Bubble key={key} role={message.role} text={block.text} onChoose={m === lastAssistant && canChoose ? onChoose : undefined} />)
      } else if (block.type === "tool_use") {
        if (isWriteTool(block.name)) {
          lastReadLabel = null
          const state = actions[block.id]
          if (state) {
            items.push(
              <motion.div key={key} {...enter}><ActionCard
                state={state}
                currency={currency}
                poster={poster}
                hasPoster={hasPoster}
                onDecide={onDecide}
                disabled={disabled}
              /></motion.div>
            )
          }
        } else {
          const label = READ_LABELS[block.name] ?? "Looked something up"
          if (label !== lastReadLabel) {
            items.push(
              <motion.div key={key} {...enter} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Search className="w-3 h-3" /> {label}
              </motion.div>
            )
          }
          lastReadLabel = label
        }
      }
    })
  })

  return <>{items}</>
}

function Bubble({ role, text, onChoose }: { role: string; text: string; onChoose?: (choice: string) => void }) {
  if (role === "user") {
    return (
      <motion.div {...enter} className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand text-white px-3 py-2 text-sm whitespace-pre-wrap break-words">{text}</div>
      </motion.div>
    )
  }
  return (
    <motion.div {...enter} className="w-full rounded-2xl rounded-bl-md bg-secondary px-3.5 py-3 text-sm text-foreground break-words">
      <Markdown text={text} onChoose={onChoose} />
    </motion.div>
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

const COLLAPSED_ROWS = 5

function MarkdownTable({ rows }: { rows: string[][] }) {
  const [expanded, setExpanded] = useState(false)
  const [head = [], ...allBody] = rows
  const columns = Math.max(head.length, ...allBody.map((r) => r.length))
  const numeric = Array.from({ length: columns }, (_, j) => {
    const cells = allBody.map((r) => stripBold(r[j] ?? "")).filter(Boolean)
    return j > 0 && cells.length > 0 && cells.every((c) => NUMERIC_CELL.test(c))
  })
  const isTotal = (r: string[]) => /^(total|totals|all events|overall)\b/i.test(stripBold(r[0] ?? ""))
  // Long tables show their first rows (and the total) until asked for the rest.
  const totals = allBody.filter(isTotal)
  const regular = allBody.filter((r) => !isTotal(r))
  const hidden = expanded ? 0 : Math.max(0, regular.length - COLLAPSED_ROWS)
  const body = [...regular.slice(0, regular.length - hidden), ...totals]
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
      {(hidden > 0 || expanded) && regular.length > COLLAPSED_ROWS && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="sticky left-0 flex w-full items-center justify-center gap-1 border-t border-border bg-muted/60 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
          <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
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

// `:::choices Masquerade Party (17 Jul) | Pool Party (26 Sep)` renders as
// buttons; picking one sends it as the organizer's reply.
function Choices({ spec, onChoose }: { spec: string; onChoose?: (choice: string) => void }) {
  const options = spec.split("|").map((o) => o.trim()).filter(Boolean).slice(0, 8)
  // Short options (categories, yes/no) sit side by side as pills; longer ones stack.
  const compact = options.length > 1 && options.every((o) => o.length <= 26)
  return (
    <motion.div
      className={cn(compact ? "flex flex-wrap gap-1.5" : "flex flex-col gap-1.5")}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
    >
      {options.map((o) => {
        const poster = ATTACH_POSTER.test(o)
        return (
          <motion.button
            key={o}
            variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
            whileTap={onChoose ? { scale: 0.97 } : undefined}
            disabled={!onChoose}
            onClick={() => onChoose?.(o)}
            className={cn(
              "group flex items-center gap-2 border text-sm transition-colors disabled:opacity-50 disabled:cursor-default",
              poster
                ? "w-full justify-center rounded-xl border-dashed border-brand/60 bg-brand/10 px-3 py-3 font-medium enabled:hover:bg-brand/20"
                : compact
                  ? "rounded-full border-border bg-background/50 px-3 py-1.5 enabled:hover:border-brand enabled:hover:bg-brand/10"
                  : "justify-between rounded-xl border-border bg-background/50 px-3 py-2.5 text-left enabled:hover:border-brand enabled:hover:bg-brand/10"
            )}
          >
            {poster && <Paperclip className="w-4 h-4" />}
            <span><Inline text={o} /></span>
            {!poster && !compact && <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">›</span>}
          </motion.button>
        )
      })}
    </motion.div>
  )
}

function Markdown({ text, onChoose }: { text: string; onChoose?: (choice: string) => void }) {
  const lines = text.split("\n")
  const blocks: React.ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || /^\s*(-{3,}|\*{3,})\s*$/.test(line) || SUGGEST_LINE.test(line)) {
      i++
      continue
    }
    const choices = line.match(/^\s*:::choices\s+(.*)$/)
    if (choices) {
      blocks.push(<Choices key={blocks.length} spec={choices[1]} onChoose={onChoose} />)
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
    while (i < lines.length && lines[i].trim() && !/^\s*([-*•]|\d+\.)\s+|^\s*\||^#{1,6}\s|^\s*:::(stats|choices|suggest)/.test(lines[i])) {
      paragraph.push(lines[i])
      i++
    }
    blocks.push(<p key={blocks.length} className="whitespace-pre-wrap leading-relaxed"><Inline text={paragraph.join("\n")} /></p>)
  }
  return <div className="space-y-2.5">{blocks}</div>
}
