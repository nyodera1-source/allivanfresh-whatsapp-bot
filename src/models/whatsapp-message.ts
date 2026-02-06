/**
 * WhatsApp message types for wasenderapi
 */

export interface WhatsAppIncomingMessage {
  id: string;
  from: string; // Phone number with country code
  to: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  text?: {
    body: string;
  };
  image?: {
    url: string;
    caption?: string;
  };
}

// wasenderapi webhook payload format
export interface WhatsAppWebhookPayload {
  event?: string; // e.g., "messages.received", "messages-personal.received"
  sessionId?: string;
  pushName?: string; // Sender's name
  broadcast?: boolean;
  messageBody?: string; // The actual message text
  remoteJid?: string; // Sender's JID (phone@lid or phone@s.whatsapp.net)
  senderPn?: string; // Sender phone number with @s.whatsapp.net
  cleanedSenderPn?: string; // Clean phone number without suffix
  timestamp?: number;
  message?: {
    conversation?: string;
    id?: string;
    [key: string]: any;
  };
  // Nested key object (wasenderapi sometimes nests fields here)
  key?: {
    event?: string;
    id?: string;
    fromMe?: boolean;
    remoteJid?: string;
    senderPn?: string;
    cleanedSenderPn?: string;
    messageBody?: string;
    [key: string]: any;
  };
  data?: {
    messages?: any;
    [key: string]: any;
  };
  // Legacy format support
  messages?: WhatsAppIncomingMessage[];
  statuses?: any[];
}

export interface WhatsAppOutgoingMessage {
  to: string; // Phone number with country code
  type: 'text';
  text: {
    body: string;
  };
}

export interface WhatsAppApiResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
