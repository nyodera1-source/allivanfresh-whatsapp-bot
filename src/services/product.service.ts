import { prisma } from '../database/client';
import { Product, ProductCategory, AvailabilityStatus, Prisma } from '@prisma/client';
import { CATEGORY_DESCRIPTIONS } from '../config/constants';

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
   * Shows categories in order: Fish → Chicken → Vegetables with descriptions
   */
  formatProductCatalog(products: Product[]): string {
    if (products.length === 0) {
      return 'No products available at the moment.';
    }

    const grouped = this.groupProductsByCategory(products);

    // Display categories in strategic order: anchor products first, then add-ons
    const categoryOrder: Array<{ key: string; description: string }> = [
      { key: 'FISH', description: CATEGORY_DESCRIPTIONS.FISH },
      { key: 'CHICKEN', description: CATEGORY_DESCRIPTIONS.CHICKEN },
      { key: 'VEGETABLES', description: CATEGORY_DESCRIPTIONS.VEGETABLES },
    ];

    let catalog = '';

    for (const { key, description } of categoryOrder) {
      const categoryProducts = grouped[key];
      if (!categoryProducts || categoryProducts.length === 0) continue;

      catalog += `\n## ${key}\n_${description}_\n\n`;

      categoryProducts.forEach((product) => {
        const name = product.nameSwahili
          ? `${product.name} (${product.nameSwahili})`
          : product.name;

        catalog += `### ${name}\n`;
        catalog += `- Price: KES ${product.basePrice} ${product.unit}\n`;
        catalog += `- Description: ${product.description}\n`;
        catalog += `- Availability: ${this.formatAvailability(product.availability, product.stockQuantity)}\n`;

        if (product.availabilityNotes) {
          catalog += `- Note: ${product.availabilityNotes}\n`;
        }

        catalog += `- Product ID: ${product.id}\n\n`;
      });
    }

    // Include any other categories not in the standard order
    for (const [category, categoryProducts] of Object.entries(grouped)) {
      if (categoryOrder.some(c => c.key === category)) continue;
      catalog += `\n## ${category}\n\n`;
      categoryProducts.forEach((product) => {
        const name = product.nameSwahili
          ? `${product.name} (${product.nameSwahili})`
          : product.name;
        catalog += `### ${name}\n`;
        catalog += `- Price: KES ${product.basePrice} ${product.unit}\n`;
        catalog += `- Description: ${product.description}\n`;
        catalog += `- Availability: ${this.formatAvailability(product.availability, product.stockQuantity)}\n`;
        catalog += `- Product ID: ${product.id}\n\n`;
      });
    }

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
   * Decrement stock for ordered items. Auto-marks OUT_OF_STOCK when quantity hits 0.
   */
  async decrementStock(productId: string, quantity: number): Promise<void> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.stockQuantity === null) return; // null = unlimited

    const newQty = Math.max(0, product.stockQuantity - Math.ceil(quantity));
    const updates: any = { stockQuantity: newQty };
    if (newQty === 0) {
      updates.availability = AvailabilityStatus.OUT_OF_STOCK;
    }

    await prisma.product.update({ where: { id: productId }, data: updates });
    console.log(`[Stock] ${product.name}: ${product.stockQuantity} → ${newQty}`);
  }

  /**
   * Update a product (used by admin panel)
   */
  async updateProduct(productId: string, data: {
    basePrice?: number;
    stockQuantity?: number | null;
    availability?: AvailabilityStatus;
    imageUrl?: string | null;
    isActive?: boolean;
  }): Promise<Product> {
    return prisma.product.update({
      where: { id: productId },
      data: data as Prisma.ProductUpdateInput,
    });
  }

  /**
   * Check if a product is in stock
   */
  isInStock(product: Product): boolean {
    if (product.availability === AvailabilityStatus.OUT_OF_STOCK) return false;
    if (product.stockQuantity !== null && product.stockQuantity <= 0) return false;
    return true;
  }

  /**
   * Format availability status
   */
  private formatAvailability(status: AvailabilityStatus, stockQuantity?: number | null): string {
    if (stockQuantity !== undefined && stockQuantity !== null && stockQuantity <= 0) {
      return 'OUT OF STOCK';
    }
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
