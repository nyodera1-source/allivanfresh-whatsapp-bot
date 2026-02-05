# Quick Setup Guide - AllivanFresh WhatsApp Bot

Follow these steps to get your bot running!

## Step 1: Install Dependencies

Open your terminal in this directory and run:

```bash
npm install
```

This will install all required packages.

## Step 2: Create Environment File

Create a file named `.env` in the root directory with your credentials:

```bash
# Application
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000

# Database (paste your Railway DATABASE_URL here)
DATABASE_URL=postgresql://...

# wasenderapi (paste your credentials)
WASENDER_API_KEY=your_api_key_here
WASENDER_WEBHOOK_SECRET=your_webhook_secret
WASENDER_INSTANCE_ID=your_instance_id
WASENDER_API_URL=https://api.wasender.com/v1

# Claude API (paste your Anthropic API key)
ANTHROPIC_API_KEY=sk-ant-xxxxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=2048

# Email (Gmail credentials)
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

## Step 3: Set Up Database

Run these commands to set up your database:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Seed database with products
npm run db:seed
```

You should see output like:
```
✅ Created 8 fish products
✅ Created 11 chicken products
✅ Created 12 vegetable products
✅ Created 4 value baskets
✅ Created 8 product recommendations
```

## Step 4: Test Locally

Start the development server:

```bash
npm run dev
```

You should see:
```
🚀 AllivanFresh WhatsApp Bot Started!
=====================================
Environment: development
Port: 3000
Webhook URL: http://localhost:3000/webhook/whatsapp
=====================================
```

Open your browser and visit:
- http://localhost:3000 (should show app info)
- http://localhost:3000/health (should show "status: ok")

## Step 5: Test with wasenderapi (Optional - Local Testing)

If you want to test locally before deploying, you can use a tool like ngrok to expose your local server:

1. Install ngrok: https://ngrok.com/download
2. Run: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. Configure this URL + `/webhook/whatsapp` in wasenderapi

## Step 6: Deploy to Railway

### Option A: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link your project
railway link

# Deploy
railway up

# Run database setup on Railway
railway run npx prisma db push
railway run npm run db:seed
```

### Option B: Using Railway Dashboard

1. Go to Railway dashboard
2. Create new project from GitHub (or upload code)
3. Add PostgreSQL service
4. Set all environment variables in Railway dashboard
5. Deploy
6. Run commands via Railway CLI:
   ```bash
   railway run npx prisma db push
   railway run npm run db:seed
   ```

## Step 7: Configure Webhook

After deployment, you'll get a Railway URL like: `https://your-app.railway.app`

1. Go to wasenderapi dashboard
2. Navigate to webhook settings
3. Set webhook URL to: `https://your-app.railway.app/webhook/whatsapp`
4. Save

## Step 8: Test Your Bot!

Send a WhatsApp message to your wasenderapi number:

```
Hi
```

The bot should respond with a welcome message!

## Verification Checklist

- [ ] Dependencies installed (`npm install` succeeded)
- [ ] `.env` file created with all credentials
- [ ] Database setup completed (`npm run db:seed` succeeded)
- [ ] Local server starts without errors (`npm run dev`)
- [ ] Health check endpoint works (http://localhost:3000/health)
- [ ] Deployed to Railway successfully
- [ ] Database seeded on Railway
- [ ] Webhook URL configured in wasenderapi
- [ ] Bot responds to WhatsApp messages

## Common Issues

### Issue: "DATABASE_URL environment variable is not set"
**Solution:** Make sure `.env` file exists and contains DATABASE_URL

### Issue: "Cannot find module '@prisma/client'"
**Solution:** Run `npx prisma generate`

### Issue: "Email not sending"
**Solution:**
- Verify Gmail app password (not regular password)
- Ensure 2FA is enabled on Gmail account
- Check GMAIL_USER and GMAIL_APP_PASSWORD in `.env`

### Issue: "Webhook not receiving messages"
**Solution:**
- Check Railway logs: `railway logs`
- Verify webhook URL in wasenderapi is correct
- Test health endpoint: `curl https://your-app.railway.app/health`

### Issue: "Claude API error"
**Solution:**
- Verify ANTHROPIC_API_KEY is correct
- Check your Anthropic API usage/limits

## Next Steps

Once everything is working:

1. Update product prices in database (use Prisma Studio: `npm run db:studio`)
2. Test full order flow with a real WhatsApp message
3. Monitor Railway logs for any errors
4. Customize product catalog as needed
5. Set up monitoring and alerts

## Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Check local logs in terminal
3. Verify all environment variables are set correctly
4. Review the README.md for detailed documentation

Good luck! 🚀
