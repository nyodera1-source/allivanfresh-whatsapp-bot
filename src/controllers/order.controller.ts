import { OrderService } from '../services/order.service';
import { EmailService } from '../services/email.service';
import { ConversationService } from '../services/conversation.service';
import { RecommendationService } from '../services/recommendation.service';
import { ProductService } from '../services/product.service';
import { ConversationState } from '../models/conversation-state';
import { OrderStatus } from '@prisma/client';

export class OrderController {
  private orderService: OrderService;
  private emailService: EmailService;
  private conversationService: ConversationService;
  private recommendationService: RecommendationService;
  private productService: ProductService;

  constructor() {
    this.orderService = new OrderService();
    this.emailService = new EmailService();
    this.conversationService = new ConversationService();
    this.recommendationService = new RecommendationService();
    this.productService = new ProductService();
  }

  /**
   * Process checkout and create order
   */
  async processCheckout(customerId: string, state: ConversationState): Promise<void> {
    try {
      // Validate
      if (state.cart.length === 0) {
        throw new Error('Cart is empty');
      }

      if (!state.deliveryLocation) {
        throw new Error('Delivery location is required');
      }

      console.log(`[Order] Processing checkout for customer ${customerId}`);

      // Create order
      const order = await this.orderService.createOrder(customerId, state);

      // Update order status to confirmed
      await this.orderService.updateOrderStatus(order.id, OrderStatus.CONFIRMED);

      // Send email notification
      const emailSent = await this.emailService.sendOrderEmail(order);

      if (emailSent) {
        await this.orderService.updateOrderStatus(order.id, OrderStatus.EMAIL_SENT);
        console.log(`[Order] Email sent for order ${order.orderNumber}`);
      } else {
        console.error(`[Order] Failed to send email for order ${order.orderNumber}`);
      }

      // Decrement stock for each ordered item
      for (const item of order.items) {
        await this.productService.decrementStock(item.productId, Number(item.quantity));
      }

      // Update recommendations based on this order
      await this.recommendationService.updateRecommendationsFromOrder(
        order.items.map((item) => ({ productId: item.productId }))
      );

      // Clear cart after successful order
      await this.conversationService.clearCart(customerId);

      console.log(`[Order] Order ${order.orderNumber} processed successfully`);
    } catch (error: any) {
      console.error('[Order] Error processing checkout:', error.message);
      throw error;
    }
  }
}
