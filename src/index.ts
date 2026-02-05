import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/env';
import whatsappWebhookRouter from './webhooks/whatsapp-webhook';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'AllivanFresh WhatsApp Bot',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhook/whatsapp',
    },
  });
});

// WhatsApp webhook
app.use('/webhook/whatsapp', whatsappWebhookRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
const PORT = config.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n🚀 AllivanFresh WhatsApp Bot Started!');
  console.log('=====================================');
  console.log(`Environment: ${config.NODE_ENV}`);
  console.log(`Port: ${PORT}`);
  console.log(`Webhook URL: ${config.BASE_URL || `http://localhost:${PORT}`}/webhook/whatsapp`);
  console.log(`Health check: ${config.BASE_URL || `http://localhost:${PORT}`}/health`);
  console.log('=====================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
