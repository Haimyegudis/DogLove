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

export function subscribeMessages(conversationId: string, onInsert: (m: Message) => void) {
  const channel = supabase
    .channel(`messages_${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload: { new: Message }) => onInsert(payload.new))
    .subscribe();
  return { unsubscribe: () => supabase.removeChannel(channel) };
}
