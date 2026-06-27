export interface ConversationRow {
  conversation_id: string;
  other_id: string;
  other_name: string | null;
  other_photo: string | null;
  last_body: string | null;
  last_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
