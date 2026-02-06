import { Router, Request, Response } from 'express';
import { MessageController } from '../controllers/message.controller';
import { WhatsAppWebhookPayload, WhatsAppIncomingMessage } from '../models/whatsapp-message';
import { config } from '../config/env';

const router = Router();
const messageController = new MessageController();

// Simple in-memory deduplication to prevent processing the same message twice
const processedMessages = new Map<string, number>();
const DEDUP_TTL_MS = 60_000; // Keep message IDs for 60 seconds

function isDuplicate(messageId: string): boolean {
  const now = Date.now();
  // Clean up old entries
  for (const [id, timestamp] of processedMessages) {
    if (now - timestamp > DEDUP_TTL_MS) {
      processedMessages.delete(id);
    }
  }
  if (processedMessages.has(messageId)) {
    return true;
  }
  processedMessages.set(messageId, now);
  return false;
}

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
    // Fields can be at top level, in "key", in "messages", or in "data.messages"
    // Note: wasenderapi sends "messages" as an object, not array
    const messagesObj = payload.messages as any;
    const dataMessages = payload.data?.messages as any;

    const event = payload.event || payload.key?.event || messagesObj?.event || dataMessages?.event;
    const messageBody = payload.messageBody || payload.message?.conversation || payload.key?.messageBody ||
                        messagesObj?.messageBody || messagesObj?.message?.conversation ||
                        dataMessages?.messageBody || dataMessages?.message?.conversation;
    const remoteJid = payload.remoteJid || payload.key?.remoteJid || messagesObj?.remoteJid ||
                      messagesObj?.key?.remoteJid || payload.data?.remoteJid ||
                      dataMessages?.remoteJid || dataMessages?.key?.remoteJid;
    const cleanedSenderPn = payload.cleanedSenderPn || payload.key?.cleanedSenderPn ||
                            messagesObj?.cleanedSenderPn || messagesObj?.key?.cleanedSenderPn ||
                            dataMessages?.cleanedSenderPn || dataMessages?.key?.cleanedSenderPn;
    const senderPn = payload.senderPn || payload.key?.senderPn ||
                     messagesObj?.senderPn || messagesObj?.key?.senderPn ||
                     dataMessages?.senderPn || dataMessages?.key?.senderPn;

    console.log('[Webhook] Extracted fields - event:', event, 'messageBody:', messageBody, 'remoteJid:', remoteJid);

    if (event && messageBody) {
      console.log('[Webhook] Processing wasenderapi message format');

      // Extract phone number from remoteJid or cleanedSenderPn
      // remoteJid format: "220804788830226@lid" or "254725923814@s.whatsapp.net"
      // cleanedSenderPn format: "254725923814"
      let phoneNumber = cleanedSenderPn || '';
      if (!phoneNumber && remoteJid) {
        phoneNumber = remoteJid.split('@')[0];
      }
      if (!phoneNumber && senderPn) {
        phoneNumber = senderPn.split('@')[0];
      }

      // Build a unique message ID for deduplication
      const messageId = payload.message?.id || payload.key?.id || payload.data?.messages?.key?.id || '';
      const dedupKey = messageId || `${phoneNumber}:${messageBody}:${Math.floor(Date.now() / 5000)}`;

      if (isDuplicate(dedupKey)) {
        console.log('[Webhook] Skipping duplicate message:', dedupKey);
        return;
      }

      // Convert to our message format
      const message: WhatsAppIncomingMessage = {
        id: messageId || Date.now().toString(),
        from: phoneNumber,
        to: '', // Not provided in wasenderapi webhook
        timestamp: payload.timestamp?.toString() || Date.now().toString(),
        type: 'text',
        text: {
          body: messageBody,
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
