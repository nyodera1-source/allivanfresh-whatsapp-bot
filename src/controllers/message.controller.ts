import { WhatsAppService } from '../services/whatsapp.service';
import { ClaudeService } from '../services/claude.service';
import { ConversationService } from '../services/conversation.service';
import { ProductService } from '../services/product.service';
import { RecommendationService } from '../services/recommendation.service';
import { OrderController } from './order.controller';
import { getDeliveryQuote, getDeliveryQuoteFromCoords, getDeliveryQuoteFromDistance, parseKmFromText, classifyCart, DeliveryQuote } from '../services/delivery.service';

import { WhatsAppIncomingMessage } from '../models/whatsapp-message';
import { ClaudeActionType, ConversationStep } from '../config/constants';
import { Product } from '@prisma/client';

export class MessageController {
  private whatsappService: WhatsAppService;
  private claudeService: ClaudeService;
  private conversationService: ConversationService;
  private productService: ProductService;
  private recommendationService: RecommendationService;
  private orderController: OrderController;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.claudeService = new ClaudeService();
    this.conversationService = new ConversationService();
    this.productService = new ProductService();
    this.recommendationService = new RecommendationService();
    this.orderController = new OrderController();
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(message: WhatsAppIncomingMessage): Promise<void> {
    try {
      const from = message.from;
      const text = message.text?.body;
      const location = message.location;

      // Handle location pin messages
      if (message.type === 'location' && location) {
        console.log(`[Message] Received location pin from ${from}: ${location.latitude}, ${location.longitude}`);
        await this.handleLocationMessage(from, location);
        return;
      }

      if (!text) {
        console.log('[Message] Ignoring non-text message');
        return;
      }

      console.log(`[Message] Received from ${from}: ${text}`);

      // Get or create customer
      const customer = await this.conversationService.getOrCreateCustomer(from);

      // Get conversation state
      const state = await this.conversationService.getState(customer.id);

      // Get product catalog
      const products = await this.productService.getAllProducts();
      const productCatalog = this.productService.formatProductCatalog(products);

      // Get recommendations if cart has items
      let recommendations = '';
      if (state.cart.length > 0) {
        const recommendedProducts = await this.recommendationService.getRecommendations(
          state.cart
        );
        recommendations = this.recommendationService.formatRecommendations(recommendedProducts);
      }

      // Get message history
      const messageHistory = await this.conversationService.getMessageHistory(customer.id);

      // If we're waiting for a delivery location, pre-calculate the distance
      let deliveryQuote: DeliveryQuote | null = null;
      let locationNotFound = false;
      if (state.step === ConversationStep.REQUESTING_LOCATION) {
        // Classify cart for cart-aware delivery fee
        const cartContents = classifyCart(state.cart);

        // Try: 1) Known locations + Nominatim via getDeliveryQuote
        deliveryQuote = await getDeliveryQuote(text, cartContents);

        // 2) If that failed, check if customer gave a km distance (e.g. "about 10km")
        if (!deliveryQuote) {
          const kmDistance = parseKmFromText(text);
          if (kmDistance) {
            deliveryQuote = getDeliveryQuoteFromDistance(kmDistance, text, cartContents);
          }
        }

        if (deliveryQuote) {
          state.deliveryDistanceKm = deliveryQuote.distanceKm;
          state.deliveryFee = deliveryQuote.fee;
          state.deliveryFeeReason = deliveryQuote.feeReason;
          state.deliveryZone = deliveryQuote.zone;
          state.deliveryLocation = text;
          // Move past REQUESTING_LOCATION so next messages aren't treated as locations
          state.step = ConversationStep.CONFIRMING_ORDER;
          await this.conversationService.updateState(customer.id, state);
        } else {
          // All lookups failed - Claude should ask for clarification or location pin
          locationNotFound = true;
        }
      }

      // Get Claude's response
      const claudeResponse = await this.claudeService.processMessage(
        text,
        state,
        productCatalog,
        recommendations,
        messageHistory,
        deliveryQuote,
        locationNotFound ? text : undefined
      );

      // Execute actions (and collect product images to send)
      const productImagesToSend = await this.executeActions(customer.id, claudeResponse.actions, state);

      // Auto-detect: if Claude didn't send product images, detect from user message + response
      if (productImagesToSend.length === 0 && ['browsing', 'inquiry'].includes(claudeResponse.intent)) {
        const autoImages = this.detectProductImages(text, claudeResponse.message, products);
        productImagesToSend.push(...autoImages);
      }

      // Send product images before the text response
      if (productImagesToSend && productImagesToSend.length > 0) {
        for (const img of productImagesToSend) {
          await this.whatsappService.sendImage(from, img.imageUrl, img.caption);
        }
      }

      // Send response
      await this.whatsappService.sendMessageWithRetry(from, claudeResponse.message);

      // Save message history
      await this.conversationService.addMessageToHistory(
        customer.id,
        text,
        claudeResponse.message
      );

      console.log(`[Message] Processed successfully for ${from}`);
    } catch (error: any) {
      console.error('[Message] Error processing message:', error.message);

      // Send error message to user
      try {
        await this.whatsappService.sendMessage(
          message.from,
          'Samahani (sorry), I encountered an error. Please try again or contact us directly at +254...'
        );
      } catch (sendError) {
        console.error('[Message] Failed to send error message:', sendError);
      }
    }
  }

  /**
   * Handle a WhatsApp location pin message
   */
  private async handleLocationMessage(
    from: string,
    location: { latitude: number; longitude: number; name?: string; address?: string }
  ): Promise<void> {
    const customer = await this.conversationService.getOrCreateCustomer(from);
    const state = await this.conversationService.getState(customer.id);

    // Classify cart for cart-aware delivery fee
    const cartContents = classifyCart(state.cart);

    // Calculate delivery quote from exact GPS coordinates
    const locationLabel = location.name || location.address || `Pinned location`;
    const deliveryQuote = getDeliveryQuoteFromCoords(
      location.latitude,
      location.longitude,
      locationLabel,
      cartContents
    );

    // Update state with delivery info and move past location step
    state.deliveryDistanceKm = deliveryQuote.distanceKm;
    state.deliveryFee = deliveryQuote.fee;
    state.deliveryFeeReason = deliveryQuote.feeReason;
    state.deliveryZone = deliveryQuote.zone;
    state.deliveryLocation = locationLabel;
    state.step = ConversationStep.CONFIRMING_ORDER;
    await this.conversationService.updateState(customer.id, state);

    // Get products and history for Claude
    const products = await this.productService.getAllProducts();
    const productCatalog = this.productService.formatProductCatalog(products);
    const messageHistory = await this.conversationService.getMessageHistory(customer.id);
    let recommendations = '';
    if (state.cart.length > 0) {
      const recommendedProducts = await this.recommendationService.getRecommendations(state.cart);
      recommendations = this.recommendationService.formatRecommendations(recommendedProducts);
    }

    // Tell Claude about the pinned location
    const userMessage = `[Customer shared their location pin: ${locationLabel}]`;
    const claudeResponse = await this.claudeService.processMessage(
      userMessage,
      state,
      productCatalog,
      recommendations,
      messageHistory,
      deliveryQuote
    );

    // Execute actions and send response
    const locationImages = await this.executeActions(customer.id, claudeResponse.actions, state);
    if (locationImages && locationImages.length > 0) {
      for (const img of locationImages) {
        await this.whatsappService.sendImage(from, img.imageUrl, img.caption);
      }
    }
    await this.whatsappService.sendMessageWithRetry(from, claudeResponse.message);
    await this.conversationService.addMessageToHistory(customer.id, userMessage, claudeResponse.message);
  }

  /**
   * Execute Claude's actions. Returns product images to send (if any).
   */
  private async executeActions(
    customerId: string,
    actions: any[],
    state: any
  ): Promise<{ imageUrl: string; caption: string }[]> {
    const imagesToSend: { imageUrl: string; caption: string }[] = [];

    for (const action of actions) {
      try {
        switch (action.type) {
          case ClaudeActionType.ADD_TO_CART:
            if (action.data.productId && action.data.quantity) {
              await this.conversationService.addToCart(
                customerId,
                action.data.productId,
                action.data.quantity,
                action.data.notes
              );
              console.log(`[Action] Added to cart: ${action.data.productId}`);
            }
            break;

          case ClaudeActionType.REMOVE_FROM_CART:
            if (action.data.productId) {
              await this.conversationService.removeFromCart(customerId, action.data.productId);
              console.log(`[Action] Removed from cart: ${action.data.productId}`);
            }
            break;

          case ClaudeActionType.CLEAR_CART:
            await this.conversationService.clearCart(customerId);
            console.log(`[Action] Cleared cart for ${customerId}`);
            break;

          case ClaudeActionType.REQUEST_LOCATION:
            // Set step so next message will trigger delivery calculation
            state.step = ConversationStep.REQUESTING_LOCATION;
            await this.conversationService.updateState(customerId, state);
            console.log(`[Action] Requesting location from ${customerId}`);
            break;

          case ClaudeActionType.CONFIRM_ORDER:
            // Process checkout
            await this.orderController.processCheckout(customerId, state);
            console.log(`[Action] Order confirmed for ${customerId}`);
            break;

          case ClaudeActionType.SHOW_PRODUCTS:
            // Send product images to customer
            if (action.data.productIds && Array.isArray(action.data.productIds)) {
              for (const productId of action.data.productIds.slice(0, 5)) { // max 5 images at once
                const product = await this.productService.getProductById(productId);
                if (product && product.imageUrl) {
                  imagesToSend.push({
                    imageUrl: product.imageUrl,
                    caption: `${product.name} — KES ${product.basePrice} ${product.unit}`,
                  });
                }
              }
              console.log(`[Action] Showing ${imagesToSend.length} product images`);
            }
            break;

          default:
            console.log(`[Action] Unknown action type: ${action.type}`);
        }
      } catch (error: any) {
        console.error(`[Action] Error executing action ${action.type}:`, error.message);
      }
    }

    return imagesToSend;
  }

  /**
   * Auto-detect products mentioned in user message and send their images.
   * Fallback for when Claude doesn't include show_products action.
   */
  private detectProductImages(
    userMessage: string,
    botResponse: string,
    products: Product[]
  ): { imageUrl: string; caption: string }[] {
    const images: { imageUrl: string; caption: string }[] = [];
    const combined = `${userMessage} ${botResponse}`.toLowerCase();

    for (const product of products) {
      if (!product.imageUrl) continue;

      // Check product name and Swahili name against combined text
      const nameMatch = product.name.toLowerCase().split(/[\s()/]+/).filter(w => w.length > 3);
      const swahiliMatch = product.nameSwahili?.toLowerCase().split(/[\s()/]+/).filter(w => w.length > 3) || [];

      const allKeywords = [...nameMatch, ...swahiliMatch];

      for (const keyword of allKeywords) {
        if (combined.includes(keyword)) {
          // Avoid duplicates
          if (!images.some(img => img.imageUrl === product.imageUrl)) {
            images.push({
              imageUrl: product.imageUrl,
              caption: `${product.name} — KES ${product.basePrice} ${product.unit}`,
            });
          }
          break;
        }
      }

      if (images.length >= 3) break; // max 3 auto-detected images
    }

    if (images.length > 0) {
      console.log(`[AutoImage] Detected ${images.length} products from message text`);
    }

    return images;
  }
}
