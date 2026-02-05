import { prisma } from '../database/client';
import { Product } from '@prisma/client';
import { RECOMMENDATION_CONFIG } from '../config/constants';
import { CartItem } from '../models/conversation-state';

export class RecommendationService {
  /**
   * Get product recommendations based on cart items
   */
  async getRecommendations(cart: CartItem[]): Promise<Product[]> {
    if (cart.length === 0) {
      return [];
    }

    const productIds = cart.map((item) => item.productId);

    // Get recommendations for products in cart
    const recommendations = await prisma.productRecommendation.findMany({
      where: {
        productId: { in: productIds },
        strength: { gte: RECOMMENDATION_CONFIG.minStrength },
      },
      include: {
        recommended: true,
      },
      orderBy: {
        strength: 'desc',
      },
      take: RECOMMENDATION_CONFIG.maxRecommendations * 2, // Get more than needed
    });

    // Extract unique recommended products
    const productMap = new Map<string, Product>();

    for (const rec of recommendations) {
      const product = rec.recommended;

      // Skip if product is already in cart
      if (productIds.includes(product.id)) {
        continue;
      }

      // Skip if already added
      if (productMap.has(product.id)) {
        continue;
      }

      // Only add active, in-stock products
      if (product.isActive && product.availability === 'IN_STOCK') {
        productMap.set(product.id, product);
      }

      // Stop when we have enough
      if (productMap.size >= RECOMMENDATION_CONFIG.maxRecommendations) {
        break;
      }
    }

    return Array.from(productMap.values());
  }

  /**
   * Format recommendations for Claude
   */
  formatRecommendations(products: Product[]): string {
    if (products.length === 0) {
      return '';
    }

    let text = 'Based on the customer\'s cart, suggest these products:\n\n';

    products.forEach((product) => {
      const name = product.nameSwahili
        ? `${product.name} (${product.nameSwahili})`
        : product.name;

      text += `- ${name}: KES ${product.basePrice} ${product.unit}\n`;
      text += `  ${product.description}\n\n`;
    });

    return text;
  }

  /**
   * Update recommendations based on completed order
   */
  async updateRecommendationsFromOrder(orderItems: { productId: string }[]): Promise<void> {
    if (orderItems.length < 2) {
      return; // Need at least 2 items to create recommendations
    }

    // Create pairs of products that were bought together
    for (let i = 0; i < orderItems.length; i++) {
      for (let j = i + 1; j < orderItems.length; j++) {
        const productId1 = orderItems[i].productId;
        const productId2 = orderItems[j].productId;

        // Update recommendation strength in both directions
        await this.incrementRecommendation(productId1, productId2);
        await this.incrementRecommendation(productId2, productId1);
      }
    }

    console.log(
      `[Recommendations] Updated recommendations for ${orderItems.length} products`
    );
  }

  /**
   * Increment recommendation strength
   */
  private async incrementRecommendation(
    productId: string,
    recommendedId: string
  ): Promise<void> {
    const existing = await prisma.productRecommendation.findUnique({
      where: {
        productId_recommendedId: {
          productId,
          recommendedId,
        },
      },
    });

    if (existing) {
      // Increment strength
      await prisma.productRecommendation.update({
        where: { id: existing.id },
        data: {
          strength: existing.strength + 1,
        },
      });
    } else {
      // Create new recommendation
      await prisma.productRecommendation.create({
        data: {
          productId,
          recommendedId,
          strength: RECOMMENDATION_CONFIG.defaultStrength,
        },
      });
    }
  }

  /**
   * Get popular products (most recommended)
   */
  async getPopularProducts(limit: number = 5): Promise<Product[]> {
    const popularIds = await prisma.productRecommendation.groupBy({
      by: ['recommendedId'],
      _sum: {
        strength: true,
      },
      orderBy: {
        _sum: {
          strength: 'desc',
        },
      },
      take: limit,
    });

    const productIds = popularIds.map((item) => item.recommendedId);

    return prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
    });
  }
}
