import axios from 'axios';
import { config } from '../config/env';
import { WhatsAppOutgoingMessage, WhatsAppApiResponse } from '../models/whatsapp-message';

export class WhatsAppService {
  private apiUrl: string;
  private apiKey: string;
  private instanceId: string;

  constructor() {
    this.apiUrl = config.WASENDER_API_URL;
    this.apiKey = config.WASENDER_API_KEY;
    this.instanceId = config.WASENDER_INSTANCE_ID;
  }

  /**
   * Send a text message via wasenderapi
   */
  async sendMessage(to: string, message: string): Promise<WhatsAppApiResponse> {
    try {
      const payload: WhatsAppOutgoingMessage = {
        to,
        type: 'text',
        text: {
          body: message,
        },
      };

      const response = await axios.post(
        `${this.apiUrl}/instances/${this.instanceId}/messages`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 10000, // 10 second timeout
        }
      );

      console.log(`[WhatsApp] Message sent to ${to}:`, message.substring(0, 50));

      return {
        success: true,
        messageId: response.data.id || response.data.messageId,
      };
    } catch (error: any) {
      console.error('[WhatsApp] Error sending message:', error.response?.data || error.message);

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
