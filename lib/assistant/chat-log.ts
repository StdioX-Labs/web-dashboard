// Sends each assistant turn to the SoldOut backend (POST /ai/assistant/log),
// which keeps the full transcript and per-turn stats for analysis. Logging
// never affects the chat: it runs after the response and failures only warn.

import type Anthropic from '@anthropic-ai/sdk'

const LOG_URL = 'https://api.soldoutafrica.com/api/v1/ai/assistant/log'

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

export async function logTurn(entry: TurnLog): Promise<void> {
  const username = process.env.SOLDOUT_API_USERNAME
  const password = process.env.SOLDOUT_API_PASSWORD
  if (!username || !password) return
  try {
    const response = await fetch(LOG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) console.warn(`[assistant] chat log not saved (${response.status})`)
  } catch (error) {
    console.warn('[assistant] chat log not saved:', error instanceof Error ? error.message : error)
  }
}
