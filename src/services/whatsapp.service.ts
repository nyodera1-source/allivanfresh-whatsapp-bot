import axios from 'axios';
import { config } from '../config/env';
import { WhatsAppApiResponse } from '../models/whatsapp-message';

export class WhatsAppService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.WASENDER_API_KEY;
  }

  /**
   * Send a text message via wasenderapi
   * API docs: https://wasenderapi.com/api-docs/messages/send-text-message
   */
  async sendMessage(to: string, message: string): Promise<WhatsAppApiResponse> {
    try {
      // wasenderapi expects phone number in E.164 format (just digits, no @)
      const cleanPhone = to.replace(/@.*$/, ''); // Remove @lid or @s.whatsapp.net suffix

      const payload = {
        to: cleanPhone,
        text: message,
      };

      console.log(`[WhatsApp] Sending to ${cleanPhone}:`, message.substring(0, 50));

      const response = await axios.post(
        'https://www.wasenderapi.com/api/send-message',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 10000, // 10 second timeout
        }
      );

      console.log(`[WhatsApp] Message sent successfully to ${cleanPhone}`);

      return {
        success: true,
        messageId: response.data.id || response.data.messageId,
      };
    } catch (error: any) {
      console.error('[WhatsApp] Error sending message:', error.response?.data || error.message);
      console.error('[WhatsApp] Error status:', error.response?.status);

      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Send message with retry logic
   */
  async sendMessageWithRetry(
    to: string,
    message: string,
    maxRetries: number = 3
  ): Promise<WhatsAppApiResponse> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const result = await this.sendMessage(to, message);

      if (result.success) {
        return result;
      }

      console.log(`[WhatsApp] Retry ${attempt}/${maxRetries} for ${to}`);

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    return {
      success: false,
      error: `Failed after ${maxRetries} attempts`,
    };
  }
}
