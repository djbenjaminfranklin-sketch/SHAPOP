import { Router } from 'express'
import type { Request, Response } from 'express'
import { supabase, supabaseUrl } from '../config'
import { requireAuth, messageLimiter } from '../middleware'
import { escapeHtml, detectContactInfo, handleAutoSanction } from '../utils'
import type { AuthenticatedRequest } from '../types'

const router = Router()

// =============================================
// CHAT FILTERING (Priority #1 — replaces direct Supabase insert)
// =============================================
router.post('/api/chat/send', messageLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { stream_id, message, type } = req.body
    if (!stream_id || !message || typeof message !== 'string') {
      res.status(400).json({ error: 'stream_id and message are required' })
      return
    }

    const msgType = type === 'reaction' ? 'reaction' : 'message'

    const trimmed = escapeHtml(message.trim().slice(0, 500)) // Max 500 chars, XSS-safe
    if (!trimmed) {
      res.status(400).json({ error: 'Message cannot be empty' })
      return
    }

    // Skip contact-info flagging for reactions
    const flagReason = msgType === 'reaction' ? null : detectContactInfo(trimmed)
    const isFlagged = flagReason !== null

    const { data, error } = await supabase.from('chat_messages').insert({
      stream_id,
      user_id: req.user!.id,
      message: trimmed,
      type: msgType,
      is_flagged: isFlagged,
      flag_reason: flagReason,
    }).select('*').single()

    if (error) {
      res.status(500).json({ error: 'Failed to send message' })
      return
    }

    // Auto-sanction if flagged
    if (isFlagged) {
      handleAutoSanction(req.user!.id, flagReason!).catch(err => { if (process.env.NODE_ENV !== 'production') console.error('handleAutoSanction failed:', err) })
    }

    res.json({ ...data, warning: isFlagged ? 'contact_blocked' : undefined })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// CHAT MODERATION
// =============================================

// Helper: check if user is seller or moderator for a stream
async function isModOrSeller(userId: string, streamId: string): Promise<boolean> {
  const { data: stream } = await supabase
    .from('streams')
    .select('seller_id, moderator_ids')
    .eq('id', streamId)
    .single()
  if (!stream) return false
  if (stream.seller_id === userId) return true
  const mods: string[] = stream.moderator_ids || []
  return mods.includes(userId)
}

// DELETE /api/chat/:messageId — delete a chat message (seller or mod)
router.delete('/api/chat/:messageId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const messageId = String(req.params.messageId)
    const userId = req.user!.id

    // Get the message to find stream_id
    const { data: msg } = await supabase
      .from('chat_messages')
      .select('id, stream_id')
      .eq('id', messageId)
      .single()

    if (!msg) {
      res.status(404).json({ error: 'Message not found' })
      return
    }

    const allowed = await isModOrSeller(userId, msg.stream_id)
    if (!allowed) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    await supabase.from('chat_messages').delete().eq('id', messageId)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/streams/:streamId/timeout — timeout a user from chat
router.post('/api/streams/:streamId/timeout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = String(req.params.streamId)
    const { target_user_id, duration_minutes } = req.body
    const userId = req.user!.id

    if (!target_user_id || !duration_minutes) {
      res.status(400).json({ error: 'target_user_id and duration_minutes required' })
      return
    }

    const allowed = await isModOrSeller(userId, streamId)
    if (!allowed) {
      res.status(403).json({ error: 'Not authorized' })
      return
    }

    // Insert a system message to notify
    await supabase.from('chat_messages').insert({
      stream_id: streamId,
      user_id: userId,
      message: `__system:timeout:${target_user_id}:${duration_minutes}__`,
      type: 'system',
    })

    res.json({ ok: true, until: new Date(Date.now() + duration_minutes * 60000).toISOString() })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/streams/:streamId/moderators — add a moderator
router.post('/api/streams/:streamId/moderators', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = String(req.params.streamId)
    const { user_id: modUserId } = req.body
    const userId = req.user!.id

    // Only seller can add mods
    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, moderator_ids')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== userId) {
      res.status(403).json({ error: 'Only the seller can add moderators' })
      return
    }

    const mods: string[] = stream.moderator_ids || []
    if (mods.includes(modUserId)) {
      res.json({ ok: true, moderator_ids: mods })
      return
    }

    const updated = [...mods, modUserId]
    await supabase.from('streams').update({ moderator_ids: updated }).eq('id', streamId)

    // System message
    const { data: modProfile } = await supabase.from('profiles').select('display_name').eq('id', modUserId).single()
    await supabase.from('chat_messages').insert({
      stream_id: streamId,
      user_id: userId,
      message: `__system:mod_added:${modProfile?.display_name || 'User'}__`,
      type: 'system',
    })

    res.json({ ok: true, moderator_ids: updated })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /api/streams/:streamId/moderators/:modId — remove a moderator
router.delete('/api/streams/:streamId/moderators/:modId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const streamId = String(req.params.streamId)
    const modId = String(req.params.modId)
    const userId = req.user!.id

    const { data: stream } = await supabase
      .from('streams')
      .select('seller_id, moderator_ids')
      .eq('id', streamId)
      .single()

    if (!stream || stream.seller_id !== userId) {
      res.status(403).json({ error: 'Only the seller can remove moderators' })
      return
    }

    const mods: string[] = stream.moderator_ids || []
    const updated = mods.filter(id => id !== modId)
    await supabase.from('streams').update({ moderator_ids: updated }).eq('id', streamId)

    res.json({ ok: true, moderator_ids: updated })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// =============================================
// CONVERSATIONS (Internal messaging — Phase 3)
// =============================================

// List user's conversations
router.get('/api/conversations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const { data, error } = await supabase
      .from('conversations')
      .select('*, order:orders(id, amount, status, item:items(title, image_urls))')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      res.status(500).json({ error: 'Failed to fetch conversations' })
      return
    }

    // Enrich with other participant profile and last message
    const enriched = await Promise.all((data || []).map(async (conv: any) => {
      const otherId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, username')
        .eq('id', otherId)
        .single()

      const { data: lastMsg } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return { ...conv, other_participant: profile, last_message: lastMsg }
    }))

    res.json(enriched)
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get messages for a conversation
router.get('/api/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convId = req.params.id
    const userId = req.user!.id

    // Verify participant
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .single()

    if (!conv || (conv.participant_1 !== userId && conv.participant_2 !== userId)) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    // Get blocked user IDs to filter out their messages
    const { data: blockedUsers } = await supabase
      .from('user_blocks')
      .select('blocked_id')
      .eq('blocker_id', userId)
    const blockedIds = (blockedUsers || []).map((b: { blocked_id: string }) => b.blocked_id)

    let query = supabase
      .from('conversation_messages')
      .select('*, sender:profiles!sender_id(display_name, avatar_url)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    if (blockedIds.length > 0) {
      // Filter out messages from blocked users
      for (const blockedId of blockedIds) {
        query = query.neq('sender_id', blockedId)
      }
    }

    const { data, error } = await query

    if (error) {
      res.status(500).json({ error: 'Failed to fetch messages' })
      return
    }

    res.json(data || [])
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Send message in conversation (with filtering)
router.post('/api/conversations/:id/messages', messageLimiter, requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const convId = req.params.id
    const userId = req.user!.id
    const { message, attachment_urls } = req.body

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' })
      return
    }

    // Validate attachment URLs - only allow Supabase storage URLs
    const validatedUrls = (attachment_urls || []).filter((url: string) => {
      if (typeof url !== 'string') return false
      return url.startsWith(supabaseUrl + '/storage/')
    })

    // Verify participant
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', convId)
      .single()

    if (!conv || (conv.participant_1 !== userId && conv.participant_2 !== userId)) {
      res.status(403).json({ error: 'Access denied' })
      return
    }

    if (conv.status !== 'active') {
      res.status(400).json({ error: 'Conversation is closed' })
      return
    }

    const trimmed = escapeHtml(message.trim().slice(0, 2000))
    const flagReason = detectContactInfo(trimmed)
    const isFlagged = flagReason !== null

    const { data, error } = await supabase.from('conversation_messages').insert({
      conversation_id: convId,
      sender_id: userId,
      message: trimmed,
      is_flagged: isFlagged,
      flag_reason: flagReason,
      attachment_urls: validatedUrls,
    }).select('*, sender:profiles!sender_id(display_name, avatar_url)').single()

    if (error) {
      res.status(500).json({ error: 'Failed to send message' })
      return
    }

    // Auto-sanction if flagged
    if (isFlagged) {
      handleAutoSanction(userId, flagReason!).catch(err => { if (process.env.NODE_ENV !== 'production') console.error('handleAutoSanction failed:', err) })
    }

    res.json({ ...data, warning: isFlagged ? 'contact_blocked' : undefined })
  } catch {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
