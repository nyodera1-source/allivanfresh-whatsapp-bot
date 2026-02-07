import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  BASE_URL: z.string().url().optional(),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // wasenderapi
  WASENDER_API_KEY: z.string().min(1, 'WASENDER_API_KEY is required'),
  WASENDER_WEBHOOK_SECRET: z.string().optional(),
  WASENDER_INSTANCE_ID: z.string().min(1, 'WASENDER_INSTANCE_ID is required'),
  WASENDER_API_URL: z.string().url().default('https://api.wasender.com/v1'),

  // Claude API
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  CLAUDE_MAX_TOKENS: z.string().transform(Number).default('2048'),

  // Email
  GMAIL_USER: z.string().email('Invalid GMAIL_USER email'),
  GMAIL_APP_PASSWORD: z.string().min(1, 'GMAIL_APP_PASSWORD is required'),

  // Business Configuration
  BUSINESS_HOURS_START: z.string().transform(Number).default('8'),
  BUSINESS_HOURS_END: z.string().transform(Number).default('18'),
  TIMEZONE: z.string().default('Africa/Nairobi'),
  ORDER_EMAIL_RECIPIENT: z.string().email('Invalid ORDER_EMAIL_RECIPIENT email'),

  // Session Management
  CONVERSATION_TIMEOUT_MINUTES: z.string().transform(Number).default('30'),
  MAX_MESSAGE_HISTORY: z.string().transform(Number).default('10'),

  // Admin Panel
  ADMIN_PASSWORD: z.string().min(1).default('admin123'),

  // Cloudinary (for product images)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
});

// Validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const config = parseEnv();

// Type-safe config export
export type Config = z.infer<typeof envSchema>;
