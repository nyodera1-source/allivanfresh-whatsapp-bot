import { WhatsAppService } from '../services/whatsapp.service';
import { ClaudeService } from '../services/claude.service';
import { ConversationService } from '../services/conversation.service';
import { ProductService } from '../services/product.service';
import { RecommendationService } from '../services/recommendation.service';
import { OrderController } from './order.controller';
import { getDeliveryQuote, DeliveryQuote } from '../services/delivery.service';

import { WhatsAppIncomingMessage } from '../models/whatsapp-message';
import { ClaudeActionType, ConversationStep } from '../config/constants';

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
        deliveryQuote = await getDeliveryQuote(text);
        if (deliveryQuote) {
          state.deliveryDistanceKm = deliveryQuote.distanceKm;
          state.deliveryFee = deliveryQuote.fee;
          state.deliveryZone = deliveryQuote.zone;
          state.deliveryLocation = text;
          await this.conversationService.updateState(customer.id, state);
        } else {
          // Geocoding failed - Claude should ask for clarification
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

      // Execute actions
      await this.executeActions(customer.id, claudeResponse.actions, state);

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
   * Execute Claude's actions
   */
  private async executeActions(
    customerId: string,
    actions: any[],
    state: any
  ): Promise<void> {
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

          default:
            console.log(`[Action] Unknown action type: ${action.type}`);
        }
      } catch (error: any) {
        console.error(`[Action] Error executing action ${action.type}:`, error.message);
      }
    }
  }
}
