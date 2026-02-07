import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { ProductService } from '../services/product.service';
import { AvailabilityStatus } from '@prisma/client';
import path from 'path';

const router = Router();
const productService = new ProductService();

/**
 * Simple auth middleware — checks Bearer token matches ADMIN_PASSWORD
 */
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.substring(7);
  if (token !== config.ADMIN_PASSWORD) {
    res.status(403).json({ error: 'Invalid password' });
    return;
  }
  next();
}

/**
 * GET /admin — serve the admin HTML page
 */
router.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.resolve('public/admin.html'));
});

/**
 * GET /admin/api/products — list all products (with auth)
 */
router.get('/api/products', adminAuth, async (_req: Request, res: Response) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /admin/api/products/:id — update a product (with auth)
 */
router.put('/api/products/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { basePrice, stockQuantity, availability, imageUrl, isActive } = req.body;

    const updateData: any = {};
    if (basePrice !== undefined) updateData.basePrice = Number(basePrice);
    if (stockQuantity !== undefined) updateData.stockQuantity = stockQuantity === null ? null : Number(stockQuantity);
    if (availability !== undefined && Object.values(AvailabilityStatus).includes(availability)) {
      updateData.availability = availability;
    }
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl || null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await productService.updateProduct(id, updateData);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/api/config — return Cloudinary config for the upload widget
 */
router.get('/api/config', adminAuth, (_req: Request, res: Response) => {
  res.json({
    cloudinaryCloudName: config.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryUploadPreset: config.CLOUDINARY_UPLOAD_PRESET || '',
  });
});

export default router;
