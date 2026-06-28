import { supabase } from '../lib/supabase';
import type { ConversationRow, Message } from '../types/chat';

export async function listConversations() {
  const { data, error } = await supabase.rpc('list_conversations');
  return { data: (data as ConversationRow[]) ?? [], error: error?.message ?? null };
}

export async function listMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  return { data: (data as Message[]) ?? [], error: error?.message ?? null };
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: senderId, body });
  return { error: error?.message ?? null };
}

// Inbox-wide listener: RLS only delivers messages from conversations the
// current user belongs to, so a single unfiltered INSERT subscription is a
// safe "you got mail" feed for the whole app (used for the new-message toast).
export function subscribeInboxMessages(onInsert: (m: Message) => void) {
  const channel = supabase
    .channel('inbox_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload: { new: Message }) => onInsert(payload.new))
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(channel) };
}

export function subscribeMessages(conversationId: string, onInsert: (m: Message) => void) {
  const channel = supabase
    .channel(`messages_${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload: { new: Message }) => onInsert(payload.new))
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(channel) };
}
