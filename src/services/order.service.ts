import { prisma } from '../database/client';
import { ConversationState } from '../models/conversation-state';
import { OrderStatus } from '@prisma/client';
import { getNextDeliveryDate } from '../utils/business-hours';
import { ORDER_CONFIG } from '../config/constants';

export class OrderService {
  /**
   * Create an order from conversation state
   */
  async createOrder(customerId: string, state: ConversationState) {
    if (state.cart.length === 0) {
      throw new Error('Cart is empty');
    }

    if (!state.deliveryLocation) {
      throw new Error('Delivery location is required');
    }

    const orderNumber = await this.generateOrderNumber();
    const deliveryDate = getNextDeliveryDate();
    const totalAmount = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId,
        deliveryLocation: state.deliveryLocation,
        deliveryDate,
        deliveryNotes: state.deliveryNotes,
        status: OrderStatus.PENDING,
        totalAmount,
        items: {
          create: state.cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    console.log(`[Order] Created order ${orderNumber} for customer ${customerId}`);

    return order;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const updates: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === OrderStatus.CONFIRMED) {
      updates.confirmedAt = new Date();
    } else if (status === OrderStatus.EMAIL_SENT) {
      updates.emailSentAt = new Date();
    }

    return prisma.order.update({
      where: { id: orderId },
      data: updates,
    });
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string) {
    return prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });
  }

  /**
   * Get orders for a customer
   */
  async getCustomerOrders(customerId: string) {
    return prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(): Promise<string> {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

    // Count today's orders
    const count = await prisma.order.count({
      where: {
        orderNumber: {
          startsWith: `${ORDER_CONFIG.orderNumberPrefix}-${today}-`,
        },
      },
    });

    const orderNumber = `${ORDER_CONFIG.orderNumberPrefix}-${today}-${String(count + 1).padStart(3, '0')}`;

    // Check if it already exists (race condition safety)
    const existing = await prisma.order.findUnique({
      where: { orderNumber },
    });

    if (existing) {
      // Recursive call to generate a new one
      return this.generateOrderNumber();
    }

    return orderNumber;
  }
}
