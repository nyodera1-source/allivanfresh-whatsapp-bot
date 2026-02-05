import { prisma } from '../database/client';
import { Product, ProductCategory, AvailabilityStatus } from '@prisma/client';

export class ProductService {
  /**
   * Get all active products
   */
  async getAllProducts(): Promise<Product[]> {
    return prisma.product.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: ProductCategory): Promise<Product[]> {
    return prisma.product.findMany({
      where: {
        isActive: true,
        category,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  /**
   * Search products by name or description
   */
  async searchProducts(query: string): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();

    return prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: lowerQuery, mode: 'insensitive' } },
          { nameSwahili: { contains: lowerQuery, mode: 'insensitive' } },
          { description: { contains: lowerQuery, mode: 'insensitive' } },
          { descriptionSwahili: { contains: lowerQuery, mode: 'insensitive' } },
        ],
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id: productId },
    });
  }

  /**
   * Get in-stock products only
   */
  async getInStockProducts(): Promise<Product[]> {
    return prisma.product.findMany({
      where: {
        isActive: true,
        availability: AvailabilityStatus.IN_STOCK,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  /**
   * Format products for Claude's catalog
   */
  formatProductCatalog(products: Product[]): string {
    if (products.length === 0) {
      return 'No products available at the moment.';
    }

    const grouped = this.groupProductsByCategory(products);

    let catalog = '';

    Object.entries(grouped).forEach(([category, products]) => {
      catalog += `\n## ${category.toUpperCase()}\n\n`;

      products.forEach((product) => {
        const name = product.nameSwahili
          ? `${product.name} (${product.nameSwahili})`
          : product.name;

        catalog += `### ${name}\n`;
        catalog += `- Price: KES ${product.basePrice} ${product.unit}\n`;
        catalog += `- Description: ${product.description}\n`;
        catalog += `- Availability: ${this.formatAvailability(product.availability)}\n`;

        if (product.availabilityNotes) {
          catalog += `- Note: ${product.availabilityNotes}\n`;
        }

        catalog += `- Product ID: ${product.id}\n\n`;
      });
    });

    return catalog;
  }

  /**
   * Group products by category
   */
  private groupProductsByCategory(products: Product[]): Record<string, Product[]> {
    return products.reduce(
      (acc, product) => {
        const category = product.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(product);
        return acc;
      },
      {} as Record<string, Product[]>
    );
  }

  /**
   * Format availability status
   */
  private formatAvailability(status: AvailabilityStatus): string {
    switch (status) {
      case AvailabilityStatus.IN_STOCK:
        return 'In Stock';
      case AvailabilityStatus.AVAILABLE_ON_REQUEST:
        return 'Available on Request (confirm with customer)';
      case AvailabilityStatus.OUT_OF_STOCK:
        return 'Out of Stock';
      default:
        return 'Unknown';
    }
  }
}
