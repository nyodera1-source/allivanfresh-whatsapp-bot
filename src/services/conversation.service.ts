import { prisma } from '../database/client';
import {
  ConversationState,
  getDefaultState,
  CartItem,
  ConversationMessage,
} from '../models/conversation-state';
import { config } from '../config/env';
import { cleanPhoneNumber } from '../utils/formatters';

export class ConversationService {
  /**
   * Get or create a customer
   */
  async getOrCreateCustomer(phoneNumber: string) {
    const cleanedPhone = cleanPhoneNumber(phoneNumber);

    // Use upsert to avoid race condition when multiple webhooks arrive simultaneously
    const customer = await prisma.customer.upsert({
      where: { phoneNumber: cleanedPhone },
      update: { lastActiveAt: new Date() },
      create: {
        phoneNumber: cleanedPhone,
        lastActiveAt: new Date(),
      },
    });

    return customer;
  }

  /**
   * Get conversation state for a customer
   */
  async getState(customerId: string): Promise<ConversationState> {
    const conversation = await prisma.conversation.findUnique({
      where: { customerId },
    });

    if (!conversation) {
      return getDefaultState();
    }

    // Check if conversation has expired
    if (new Date() > conversation.expiresAt) {
      await this.clearState(customerId);
      return getDefaultState();
    }

    return conversation.state as unknown as ConversationState;
  }

  /**
   * Update conversation state
   */
  async updateState(customerId: string, state: ConversationState): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.CONVERSATION_TIMEOUT_MINUTES);

    await prisma.conversation.upsert({
      where: { customerId },
      update: {
        state: state as any,
        expiresAt,
        updatedAt: new Date(),
      },
      create: {
        customerId,
        state: state as any,
        messageHistory: [],
        expiresAt,
      },
    });
  }

  /**
   * Add message to conversation history
   */
  async addMessageToHistory(
    customerId: string,
    userMessage: string,
    assistantMessage: string
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.CONVERSATION_TIMEOUT_MINUTES);

    const conversation = await prisma.conversation.findUnique({
      where: { customerId },
    });

    const history = (conversation?.messageHistory as any[]) || [];

    // Add new messages
    history.push(
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      }
    );

    // Keep only last N messages
    const maxHistory = config.MAX_MESSAGE_HISTORY;
    const trimmedHistory = history.slice(-maxHistory);

    // Create or update conversation record
    await prisma.conversation.upsert({
      where: { customerId },
      update: {
        messageHistory: trimmedHistory as any,
        expiresAt,
      },
      create: {
        customerId,
        state: getDefaultState() as any,
        messageHistory: trimmedHistory as any,
        expiresAt,
      },
    });
  }

  /**
   * Get message history
   */
  async getMessageHistory(customerId: string): Promise<ConversationMessage[]> {
    const conversation = await prisma.conversation.findUnique({
      where: { customerId },
    });

    if (!conversation) {
      return [];
    }

    return (conversation.messageHistory as any[]).map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }));
  }

  /**
   * Add item to cart
   */
  async addToCart(
    customerId: string,
    productId: string,
    quantity: number,
    notes?: string
  ): Promise<void> {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error('Product not found');
    }

    const state = await this.getState(customerId);

    // Check if product already in cart
    const existingItemIndex = state.cart.findIndex((item) => item.productId === productId);

    if (existingItemIndex >= 0) {
      // Update quantity
      state.cart[existingItemIndex].quantity += quantity;
      state.cart[existingItemIndex].totalPrice =
        state.cart[existingItemIndex].quantity * Number(product.basePrice);
      if (notes) {
        state.cart[existingItemIndex].notes = notes;
      }
    } else {
      // Add new item
      const cartItem: CartItem = {
        productId: product.id,
        productName: product.name,
        productNameSwahili: product.nameSwahili || undefined,
        quantity,
        unitPrice: Number(product.basePrice),
        totalPrice: quantity * Number(product.basePrice),
        unit: product.unit,
        notes,
      };

      state.cart.push(cartItem);
    }

    await this.updateState(customerId, state);
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(customerId: string, productId: string): Promise<void> {
    const state = await this.getState(customerId);
    state.cart = state.cart.filter((item) => item.productId !== productId);
    await this.updateState(customerId, state);
  }

  /**
   * Clear cart
   */
  async clearCart(customerId: string): Promise<void> {
    const state = await this.getState(customerId);
    state.cart = [];
    await this.updateState(customerId, state);
  }

  /**
   * Update delivery location
   */
  async updateDeliveryLocation(customerId: string, location: string): Promise<void> {
    const state = await this.getState(customerId);
    state.deliveryLocation = location;
    await this.updateState(customerId, state);

    // Also update customer's default location
    await prisma.customer.update({
      where: { id: customerId },
      data: { deliveryLocation: location },
    });
  }

  /**
   * Update delivery notes
   */
  async updateDeliveryNotes(customerId: string, notes: string): Promise<void> {
    const state = await this.getState(customerId);
    state.deliveryNotes = notes;
    await this.updateState(customerId, state);
  }

  /**
   * Clear conversation state
   */
  async clearState(customerId: string): Promise<void> {
    await prisma.conversation.delete({
      where: { customerId },
    }).catch(() => {
      // Ignore if not exists
    });
  }

  /**
   * Get cart total
   */
  getCartTotal(state: ConversationState): number {
    return state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }
}
