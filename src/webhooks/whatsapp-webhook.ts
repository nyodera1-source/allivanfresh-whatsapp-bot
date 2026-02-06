import { Router, Request, Response } from 'express';
import { MessageController } from '../controllers/message.controller';
import { WhatsAppWebhookPayload, WhatsAppIncomingMessage } from '../models/whatsapp-message';
import { config } from '../config/env';

const router = Router();
const messageController = new MessageController();

/**
 * Webhook verification (GET)
 * wasenderapi sends a GET request to verify the webhook
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[Webhook] Verification request received');

    // Check if a token and mode were sent
    if (mode === 'subscribe') {
      // Check the verify token matches
      if (config.WASENDER_WEBHOOK_SECRET && token === config.WASENDER_WEBHOOK_SECRET) {
        console.log('[Webhook] Verification successful');
        res.status(200).send(challenge);
      } else {
        console.log('[Webhook] Verification failed - invalid token');
        res.sendStatus(403);
      }
    } else {
      // If no webhook secret is configured, accept all verification requests in development
      if (!config.WASENDER_WEBHOOK_SECRET && config.NODE_ENV === 'development') {
        console.log('[Webhook] Verification accepted (no secret configured)');
        res.status(200).send(challenge || 'OK');
      } else {
        res.sendStatus(403);
      }
    }
  } catch (error) {
    console.error('[Webhook] Verification error:', error);
    res.sendStatus(500);
  }
});

/**
 * Receive messages (POST)
 * wasenderapi sends incoming messages to this endpoint
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Acknowledge receipt immediately (important for webhook reliability)
    res.sendStatus(200);

    const payload: WhatsAppWebhookPayload = req.body;

    console.log('[Webhook] Received payload:', JSON.stringify(payload, null, 2));

    // Check if this is a wasenderapi format payload
    if (payload.event && payload.messageBody && payload.remoteJid) {
      console.log('[Webhook] Processing wasenderapi message format');

      // Extract phone number from remoteJid or cleanedSenderPn
      // remoteJid format: "220804788830226@lid" or "254725923814@s.whatsapp.net"
      // cleanedSenderPn format: "254725923814"
      let phoneNumber = payload.cleanedSenderPn || '';
      if (!phoneNumber && payload.remoteJid) {
        phoneNumber = payload.remoteJid.split('@')[0];
      }
      if (!phoneNumber && payload.senderPn) {
        phoneNumber = payload.senderPn.split('@')[0];
      }

      // Convert to our message format
      const message: WhatsAppIncomingMessage = {
        id: payload.message?.id || payload.data?.messages?.key?.id || Date.now().toString(),
        from: phoneNumber,
        to: '', // Not provided in wasenderapi webhook
        timestamp: payload.timestamp?.toString() || Date.now().toString(),
        type: 'text',
        text: {
          body: payload.messageBody || payload.message?.conversation || '',
        },
      };

      console.log('[Webhook] Converted message:', JSON.stringify(message, null, 2));

      // Process in background (don't await to prevent webhook timeout)
      messageController
        .handleIncomingMessage(message)
        .catch((error) => {
          console.error('[Webhook] Error processing message:', error);
        });
    }
    // Legacy format support (array of messages)
    else if (payload.messages && payload.messages.length > 0) {
      for (const message of payload.messages) {
        messageController
          .handleIncomingMessage(message)
          .catch((error) => {
            console.error('[Webhook] Error processing message:', error);
          });
      }
    }

    // Handle status updates if needed
    if (payload.statuses && payload.statuses.length > 0) {
      console.log('[Webhook] Received status updates:', payload.statuses);
    }
  } catch (error: any) {
    console.error('[Webhook] Error processing webhook:', error.message);
    // Still return 200 to prevent webhook retry storms
    // The error is already logged
  }
});

export default router;
