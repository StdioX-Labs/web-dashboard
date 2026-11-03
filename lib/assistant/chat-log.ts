// Sends each assistant turn to the SoldOut backend (POST /ai/assistant/log),
// which keeps the full transcript and per-turn stats for analysis. Logging
// never affects the chat: it runs after the response and failures only warn.

import type Anthropic from '@anthropic-ai/sdk'
import { soldoutFetch } from '@/lib/soldout-proxy'

export interface TurnLog {
  conversationId: string
  userId: number
  companyId: number
  companyName?: string
  userEmail?: string
  transcript: Anthropic.Beta.BetaMessageParam[]
  turn: {
    userMessage: string | null
    model: string
    stopReason: string | null
    toolsCalled: string[]
    pendingActions: string[]
    inputTokens: number
    outputTokens: number
    latencyMs: number
    flagged: boolean
    error: string | null
  }
}

export const CONVERSATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Logged as the organizer who chatted, with their access token. */
export async function logTurn(accessToken: string, entry: TurnLog): Promise<void> {
  try {
    const response = await soldoutFetch(accessToken, '/ai/assistant/log', {
      method: 'POST',
      body: entry,
      timeoutMs: 15000,
    })
    if (!response.ok) console.warn(`[assistant] chat log not saved (${response.status})`)
  } catch (error) {
    console.warn('[assistant] chat log not saved:', error instanceof Error ? error.message : error)
  }
}
