# AllivanFresh WhatsApp E-Commerce Bot

AI-powered WhatsApp chatbot for selling fresh fish, chicken, and vegetables from Kisumu to Nairobi, Kenya.

## Features

- 🤖 AI-powered conversations using Claude (Anthropic)
- 🐟 Product catalog (fish, chicken, vegetables, value baskets)
- 🛒 Shopping cart management
- 💡 Smart product recommendations ("Customers who bought X also bought Y")
- 📧 Email order notifications
- 🌍 English/Swahili bilingual support
- ⏰ Business hours validation (8am-6pm EAT)
- 📦 Next-day delivery model

## Tech Stack

- **Backend:** Node.js + TypeScript + Express
- **Database:** PostgreSQL (via Prisma ORM)
- **AI:** Claude 3.5 Sonnet (Anthropic)
- **WhatsApp:** wasenderapi
- **Email:** Nodemailer (Gmail)
- **Hosting:** Railway.app

## Prerequisites

- Node.js 18+ installed
- Railway account with PostgreSQL database
- wasenderapi account and API credentials
- Anthropic Claude API key
- Gmail account with app-specific password

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (use `.env.example` as template):

```bash
# Application
NODE_ENV=production
PORT=3000
BASE_URL=https://your-app.railway.app

# Database (Railway provides this)
DATABASE_URL=postgresql://user:password@host:port/database

# wasenderapi
WASENDER_API_KEY=your_api_key
WASENDER_WEBHOOK_SECRET=your_webhook_secret
WASENDER_INSTANCE_ID=your_instance_id
WASENDER_API_URL=https://api.wasender.com/v1

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=2048

# Email (Gmail)
GMAIL_USER=allivanfresh@gmail.com
GMAIL_APP_PASSWORD=your_16_character_app_password

# Business Configuration
BUSINESS_HOURS_START=8
BUSINESS_HOURS_END=18
TIMEZONE=Africa/Nairobi
ORDER_EMAIL_RECIPIENT=allivanfresh@gmail.com

# Session Management
CONVERSATION_TIMEOUT_MINUTES=30
MAX_MESSAGE_HISTORY=10
```

### 3. Set Up Database

Generate Prisma client and run migrations:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed database with initial products
npm run db:seed
```

### 4. Run Locally (Development)

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 5. Test Endpoints

- Health check: `GET http://localhost:3000/health`
- Root: `GET http://localhost:3000/`
- Webhook: `POST http://localhost:3000/webhook/whatsapp`

## Deployment to Railway

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Login to Railway

```bash
railway login
```

### 3. Link Project

```bash
railway link
```

### 4. Set Environment Variables

Go to Railway dashboard and add all environment variables from your `.env` file.

Alternatively, use CLI:

```bash
railway variables set ANTHROPIC_API_KEY=sk-ant-xxxxx
railway variables set WASENDER_API_KEY=your_key
railway variables set GMAIL_USER=allivanfresh@gmail.com
railway variables set GMAIL_APP_PASSWORD=your_password
# ... (set all other variables)
```

### 5. Deploy

```bash
railway up
```

### 6. Run Database Migrations

```bash
railway run npx prisma db push
railway run npm run db:seed
```

### 7. Configure Webhook in wasenderapi

Once deployed, get your Railway URL (e.g., `https://your-app.railway.app`) and configure the webhook in wasenderapi dashboard:

**Webhook URL:** `https://your-app.railway.app/webhook/whatsapp`

## Project Structure

```
whatsapp-bot/
├── src/
│   ├── index.ts                      # Express app entry
│   ├── config/
│   │   ├── env.ts                    # Environment config
│   │   └── constants.ts              # Business constants
│   ├── webhooks/
│   │   └── whatsapp-webhook.ts       # WhatsApp webhook handler
│   ├── services/
│   │   ├── whatsapp.service.ts       # Send messages
│   │   ├── claude.service.ts         # AI integration
│   │   ├── email.service.ts          # Order emails
│   │   ├── product.service.ts        # Product queries
│   │   ├── order.service.ts          # Order management
│   │   ├── recommendation.service.ts # Product recommendations
│   │   └── conversation.service.ts   # State management
│   ├── controllers/
│   │   ├── message.controller.ts     # Process messages
│   │   └── order.controller.ts       # Order workflow
│   ├── models/
│   │   ├── conversation-state.ts     # State interfaces
│   │   └── whatsapp-message.ts       # Message types
│   ├── utils/
│   │   ├── business-hours.ts         # Business hours check
│   │   └── formatters.ts             # Price formatting
│   └── database/
│       └── client.ts                 # Prisma client
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Seed data
└── README.md
```

## Database Schema

### Key Models

- **Product** - Fish, chicken, vegetables with pricing and attributes
- **Customer** - WhatsApp users with order history
- **Order** - Customer orders with delivery details
- **OrderItem** - Individual items in an order
- **Conversation** - Active chat sessions with cart state
- **ProductRecommendation** - Collaborative filtering for recommendations

## Usage Example

### Customer Conversation Flow

```
Customer: Hi

Bot: Habari! Welcome to AllivanFresh Kenya 🐟🍗🥬
     We deliver fresh fish, chicken, and vegetables from Kisumu to Nairobi.
     Orders today arrive fresh tomorrow!
     What would you like today?

Customer: Nataka samaki

Bot: Great choice! We have fresh fish from Lake Victoria:
     🐟 WHOLE FISH
     - Tilapia (500g: KES 250, 1kg: KES 450, 1.5kg: KES 650)
     - Nile Perch (1kg: KES 800)

     🐟 FILLETS
     - Tilapia Fillet (KES 600/kg)
     - Nile Perch Fillet (KES 950/kg)

     Which would you like?

Customer: Tilapia 1kg

Bot: Added to cart ✅
     - Tilapia Whole 1kg: KES 450

     💡 Customers who bought this also bought:
     - Tomatoes (KES 120/kg)
     - Onions (KES 100/kg)
     - Dhania (KES 30/bundle)

     Would you like to add anything else?

Customer: Checkout

Bot: Perfect! Where in Nairobi should we deliver tomorrow?

Customer: Westlands, ABC Apartments

Bot: 📦 ORDER SUMMARY
     - Tilapia Whole 1kg: KES 450

     Total: KES 690
     Delivery: Westlands, ABC Apartments
     Delivery Date: Tomorrow (Feb 6, 2026)

     Reply YES to confirm

Customer: Yes

Bot: ✅ Order confirmed! Order #AFN-20260205-001
     We'll contact you shortly for delivery.
     Thank you for choosing AllivanFresh! 🙏
```

## Troubleshooting

### Database Connection Issues

```bash
# Check if DATABASE_URL is set correctly
railway variables

# Test database connection
npx prisma db push
```

### WhatsApp Webhook Not Receiving Messages

1. Check Railway logs: `railway logs`
2. Verify webhook URL in wasenderapi dashboard
3. Test webhook endpoint: `curl https://your-app.railway.app/health`

### Email Not Sending

1. Verify Gmail app password (not regular password)
2. Check if 2FA is enabled on Gmail account
3. Test email service in Railway logs

### Claude API Errors

1. Verify ANTHROPIC_API_KEY is correct
2. Check API usage limits in Anthropic dashboard
3. Review Claude response format in logs

## Development Commands

```bash
# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate Prisma client
npx prisma generate

# Push schema to database
npm run db:push

# Seed database
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

## Monitoring

### Railway Logs

```bash
railway logs
```

### Health Check

```bash
curl https://your-app.railway.app/health
```

## Future Enhancements

- [ ] M-PESA payment integration
- [ ] Admin dashboard for product management
- [ ] Order tracking for customers
- [ ] Customer order history
- [ ] Analytics and reporting
- [ ] Image support for products
- [ ] Voice message support

## Support

For issues or questions, contact:
- Email: allivanfresh@gmail.com
- WhatsApp: +254...

## License

ISC
