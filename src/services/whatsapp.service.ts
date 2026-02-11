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
   * Optimize Cloudinary image URL for WhatsApp
   * Converts to JPEG format at 800px width for best WhatsApp compatibility
   */
  private optimizeImageUrl(url: string): string {
    if (!url.includes('res.cloudinary.com')) return url;

    // Insert Cloudinary transforms: width 800, quality auto, JPEG format
    return url.replace(
      '/image/upload/',
      '/image/upload/w_800,q_auto,f_jpg/'
    );
  }

  /**
   * Send an image message via wasenderapi
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppApiResponse> {
    try {
      const cleanPhone = to.replace(/@.*$/, '');
      const optimizedUrl = this.optimizeImageUrl(imageUrl);

      const payload: any = {
        to: cleanPhone,
        imageUrl: optimizedUrl,
      };
      if (caption) {
        payload.text = caption;
      }

      console.log(`[WhatsApp] Sending image to ${cleanPhone}: ${imageUrl.substring(0, 60)}`);

      const response = await axios.post(
        'https://www.wasenderapi.com/api/send-message',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          timeout: 15000, // 15 second timeout for images
        }
      );

      console.log(`[WhatsApp] Image sent successfully to ${cleanPhone}`);

      return {
        success: true,
        messageId: response.data.id || response.data.messageId,
      };
    } catch (error: any) {
      console.error('[WhatsApp] Error sending image:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to send image',
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
