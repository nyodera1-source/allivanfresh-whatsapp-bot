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

export interface WhatsAppWebhookPayload {
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
