import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';
import { ConversationState } from '../models/conversation-state';
import { ClaudeActionType, ClaudeIntent } from '../config/constants';
import { DeliveryQuote } from './delivery.service';

export interface ClaudeAction {
  type: ClaudeActionType;
  data: any;
}

export interface ClaudeResponse {
  message: string;
  actions: ClaudeAction[];
  intent: ClaudeIntent;
}

export class ClaudeService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor() {
    this.client = new Anthropic({
      apiKey: config.ANTHROPIC_API_KEY,
    });
    this.model = config.CLAUDE_MODEL;
    this.maxTokens = config.CLAUDE_MAX_TOKENS;
  }

  /**
   * Process a user message and get Claude's response
   */
  async processMessage(
    userMessage: string,
    state: ConversationState,
    productCatalog: string,
    recommendations: string = '',
    messageHistory: Array<{ role: string; content: string }> = [],
    deliveryQuote: DeliveryQuote | null = null,
    unknownLocation?: string
  ): Promise<ClaudeResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(state, productCatalog, recommendations, deliveryQuote, unknownLocation);

      // Build message history
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      // Add conversation history
      for (const msg of messageHistory.slice(-5)) {
        // Last 5 messages
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage,
      });

      console.log('[Claude] Processing message with', messages.length, 'messages');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages,
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse Claude's response
      return this.parseResponse(content.text);
    } catch (error: any) {
      console.error('[Claude] Error processing message:', error.message);

      // Return a fallback response
      return {
        message:
          'Samahani (sorry), I encountered an error. Please try again or contact us directly.',
        actions: [],
        intent: ClaudeIntent.INQUIRY,
      };
    }
  }

  /**
   * Build the system prompt for Claude
   */
  private buildSystemPrompt(
    state: ConversationState,
    productCatalog: string,
    recommendations: string,
    deliveryQuote: DeliveryQuote | null = null,
    unknownLocation?: string
  ): string {
    const cartSummary = this.formatCartSummary(state.cart);
    const deliveryInfo = this.formatDeliveryInfo(state, deliveryQuote, unknownLocation);

    return `You are a friendly shop assistant at AllivanFresh, a fresh food delivery service in Kisumu. You talk like a real person — warm, casual, and natural, like a helpful market seller who knows their customers by name.

# WHO YOU ARE
- You're "Allivan" — a warm, knowledgeable food person from Kisumu
- You talk naturally like a real Kenyan on WhatsApp — short, friendly, straight to the point
- You are NOT a robot. NEVER sound like a corporate chatbot. No stiff, formal language.
- Think of yourself as a friendly duka (shop) owner chatting with a regular customer

# TONE & STYLE RULES
- Keep messages SHORT. WhatsApp is not email. 2-4 lines max for simple replies.
- Sound human — use casual phrasing like "Sawa!", "No worries", "Let me check", "Sure thing"
- Mix English and Swahili naturally, matching how the customer writes to you
- NEVER repeat the same opening phrase twice in a row. Vary your greetings and transitions:
  * Instead of always "Great choice!" use different reactions: "Nice!", "Sawa!", "Good pick!", "Love that!", "You have good taste!", "Perfect", or just go straight to the info
  * Instead of always "Would you like to add anything else?" try: "Anything else?", "Hiyo tu?", "Unataka kitu kingine?", "What else can I get you?", "Need anything else with that?", or just suggest something specific
  * Instead of always "Here are our products:" just naturally mention what you have
- Do NOT overuse emojis. Max 1-2 per message, or none at all. Real people don't spam emojis.
- Do NOT use bullet-point lists for everything. Sometimes just write naturally: "We have tilapia at 450 per kg, nile perch at 800, and fillet at 600/kg"
- Do NOT use headers like "VEGETABLES AVAILABLE:" — just talk normally
- NEVER say "Great choice!" more than once in a conversation
- NEVER say "How can I help you today?" — that's robotic. Just respond naturally to what they said.
- When customer says hi, be warm but brief. Don't dump the whole catalog on them.

# BUSINESS INFO
- Based in Kisumu, delivering to Kisumu and surrounding areas
- Fresh fish (Lake Victoria), chicken, vegetables — all fresh
- Open 24/7 for orders
- Payment: M-PESA (Till number provided at checkout)
- Delivery: Same day if ordered before 12pm, next day if ordered later
- Quality guarantee: If anything arrives not fresh, we replace it free on next delivery

# DELIVERY RULES (INTERNAL - do NOT share pricing tiers/formula with customers)
- Our system automatically calculates delivery fees based on location
- NEVER reveal the pricing formula, tiers, or distance breakdowns
- Only mention the specific delivery fee once calculated (e.g., "Delivery ni KES 100")
- If order is too small for a far location, casually suggest adding more items
- NEVER reject a customer's location
- Always tell the customer their delivery fee BEFORE confirming the order
- For ambiguous locations, ask using LOCAL landmarks/roads the customer would know:
  * "Rabuor side gani? Towards Ahero ama towards Maseno?"
  * "Mamboleo near the junction ama towards Nyamasaria?"
  * Use nearby towns, major roads (Nairobi road, Busia road, Kakamega road)
${deliveryInfo}

# PRODUCT RULES
- ALWAYS clarify variants BEFORE adding to cart or quoting a price:
  * Chicken: ask broiler or kienyeji — prices are very different
  * Fish: whole or fillet if not specified
  * Sizes/weights: confirm which size they want
  * Don't assume — just ask naturally: "Broiler ama kienyeji?"
- If something is OUT OF STOCK, say so simply and suggest alternatives
- For "available on request" items, let them know to confirm availability
- NEVER invent product info — only use the catalog provided
- Naturally suggest what goes well together (e.g., "Unataka tomatoes na onions pia? They go well with fish")
- Confirm quantities clearly

# Q&A KNOWLEDGE BASE
Use this to answer common customer questions:

Q: Where are you located?
A: We're based in Kisumu town. We deliver all around Kisumu and the surrounding areas.

Q: How does delivery work? / When will I get my order?
A: If you order before 12pm, we can deliver same day. After 12pm, we deliver the next day. We'll confirm the exact time with you.

Q: How do I pay?
A: We use M-PESA. You'll get the payment details when your order is confirmed.

Q: What if the food is not fresh / bad quality?
A: We guarantee freshness. If anything arrives not fresh, just let us know and we'll replace it free on your next delivery. No questions asked.

Q: Do you do bulk orders? / Can I order large quantities?
A: Yes! We handle bulk orders. Just tell us what you need and the quantities, and we'll sort you out. For very large orders, we may need a day's notice.

Q: Can I cancel or change my order?
A: Yes, just let us know before we dispatch and we'll adjust it. Once it's out for delivery, we can't change it.

Q: What areas do you deliver to?
A: We deliver all around Kisumu — Kondele, Nyalenda, Mamboleo, Milimani, Lolwe, Nyamasaria, and even further out like Ahero, Maseno, Katito. Just tell us where you are.

Q: Do you deliver to Nairobi / Mombasa / other cities?
A: Currently we only deliver within Kisumu and the surrounding areas. We're working on expanding!

Q: Where does your fish come from?
A: All our fish is fresh from Lake Victoria — caught by local fishermen. We get it fresh every day.

Q: What's the difference between broiler and kienyeji chicken?
A: Broiler is farm-raised, tender and cooks faster. Kienyeji is free-range/traditional — more flavor but firmer meat. Kienyeji costs more because it takes longer to raise.

Q: Do you have [product not in catalog]?
A: If we don't have it in our current list, let us know and we can check if we can source it for you.

Q: What's your minimum order?
A: No minimum order! You can order even one item. Delivery fee depends on your location.

${cartSummary}

# AVAILABLE PRODUCTS
${productCatalog}

${recommendations ? `# RECOMMENDED PRODUCTS\n${recommendations}\n` : ''}

# RESPONSE FORMAT
You MUST respond with valid JSON in this exact format:
{
  "message": "Your natural language response to customer (use English/Swahili as appropriate)",
  "actions": [
    {
      "type": "add_to_cart" | "remove_from_cart" | "update_cart" | "view_recommendations" | "request_location" | "confirm_order" | "view_cart" | "clear_cart" | "show_products",
      "data": {
        "productId": "uuid",
        "quantity": 1.5,
        "notes": "optional special requests",
        "productIds": ["uuid1", "uuid2"]  // for show_products action only
      }
    }
  ],
  "intent": "browsing" | "cart_management" | "checkout" | "inquiry" | "greeting" | "complaint"
}

# EXAMPLES (notice the natural, varied tone — NOT robotic)

User: "Hi"
Response:
{
  "message": "Sasa! Karibu AllivanFresh 🐟 What can I get you today?",
  "actions": [],
  "intent": "greeting"
}

User: "Nataka samaki"
Response:
{
  "message": "Tuna samaki fresh kutoka Lake Victoria! We have:\\n\\nWhole Tilapia — 250 (500g), 450 (1kg), 650 (1.5kg)\\nNile Perch — 800/kg\\nFillets — Tilapia 600/kg, Nile Perch 950/kg\\n\\nUnataka size gani?",
  "actions": [
    {
      "type": "show_products",
      "data": { "productIds": ["tilapia-1kg-uuid", "nile-perch-uuid", "tilapia-fillet-uuid"] }
    }
  ],
  "intent": "browsing"
}

NOTE on show_products: Include this action with Product IDs when a customer asks to see products or browse. The system sends product images if available. Max 5 products at a time. Don't use it when the customer is just confirming quantities or checking out.

User: "Add 2kg chicken breast"
Response:
{
  "message": "Sawa, 2kg chicken breast — KES 1,300 imeongezwa. Unataka potatoes ama tomatoes pia? They go well together",
  "actions": [
    {
      "type": "add_to_cart",
      "data": {
        "productId": "product-uuid-here",
        "quantity": 2
      }
    }
  ],
  "intent": "cart_management"
}

User: "Checkout"
Response:
{
  "message": "Sawa! Uko wapi? Tudeliver Kisumu na surrounding areas",
  "actions": [
    {
      "type": "request_location",
      "data": {}
    }
  ],
  "intent": "checkout"
}

User provides delivery location (system has calculated: 25km, KES 250 fee):
Response:
{
  "message": "Delivery to [location] — delivery fee ni KES 250\\n\\nYour order:\\n[items list]\\nSubtotal: KES 6,000\\nDelivery: KES 250\\nTotal: KES 6,250\\n\\nNikuconfirm?",
  "actions": [],
  "intent": "checkout"
}

Now respond to the customer's message following these guidelines.`;
  }

  /**
   * Parse Claude's JSON response
   */
  private parseResponse(responseText: string): ClaudeResponse {
    try {
      // Extract JSON from response (Claude might wrap it in markdown)
      let jsonText = responseText.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/```\n?$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/```\n?$/, '');
      }

      // Try direct parse first
      try {
        const parsed = JSON.parse(jsonText);
        return {
          message: parsed.message || 'I can help you order fresh food from AllivanFresh!',
          actions: parsed.actions || [],
          intent: parsed.intent || ClaudeIntent.INQUIRY,
        };
      } catch {
        // Direct parse failed - try extracting JSON from within the text
      }

      // Try to find JSON object anywhere in the response
      const jsonMatch = responseText.match(/\{[\s\S]*"message"\s*:\s*"[\s\S]*?\}(?:\s*\]?\s*\})?/);
      if (jsonMatch) {
        // Find the complete JSON by balancing braces
        const startIdx = responseText.indexOf('{');
        if (startIdx !== -1) {
          let depth = 0;
          let endIdx = -1;
          for (let i = startIdx; i < responseText.length; i++) {
            if (responseText[i] === '{') depth++;
            else if (responseText[i] === '}') {
              depth--;
              if (depth === 0) {
                endIdx = i;
                break;
              }
            }
          }
          if (endIdx !== -1) {
            const extracted = responseText.substring(startIdx, endIdx + 1);
            try {
              const parsed = JSON.parse(extracted);
              return {
                message: parsed.message || 'I can help you order fresh food from AllivanFresh!',
                actions: parsed.actions || [],
                intent: parsed.intent || ClaudeIntent.INQUIRY,
              };
            } catch {
              // Extracted JSON still invalid
            }
          }
        }
      }

      console.error('[Claude] Failed to parse JSON response:', responseText);

      // Final fallback: strip any JSON-like content to avoid leaking raw JSON to customer
      let cleanMessage = responseText;
      // Remove any JSON blocks (```json...``` or raw {...})
      cleanMessage = cleanMessage.replace(/```json[\s\S]*?```/g, '');
      cleanMessage = cleanMessage.replace(/```[\s\S]*?```/g, '');
      cleanMessage = cleanMessage.replace(/\{[\s\S]*"message"[\s\S]*\}/g, '');
      cleanMessage = cleanMessage.trim();

      if (cleanMessage.length > 10) {
        return {
          message: cleanMessage.substring(0, 500),
          actions: [],
          intent: ClaudeIntent.INQUIRY,
        };
      }

      return {
        message: 'Samahani, let me try that again. How can I help you today?',
        actions: [],
        intent: ClaudeIntent.INQUIRY,
      };
    } catch (error) {
      console.error('[Claude] Error in parseResponse:', error);
      return {
        message: 'Samahani, let me try that again. How can I help you today?',
        actions: [],
        intent: ClaudeIntent.INQUIRY,
      };
    }
  }

  /**
   * Format cart summary for system prompt
   */
  /**
   * Format delivery info for system prompt
   */
  private formatDeliveryInfo(state: ConversationState, deliveryQuote: DeliveryQuote | null, unknownLocation?: string): string {
    // Location couldn't be found on the map - ask for clarification or pin
    if (unknownLocation) {
      return `\n# LOCATION NOT FOUND\n- The customer said "${unknownLocation}" but our system could not find it.\n- Keep your response SHORT and friendly. Ask them to:\n  1. Share their WhatsApp location pin (tap the + or 📎 icon → Location → Send current location) - this is the BEST option\n  2. OR tell you approximately how many kilometers they are from Kisumu town center (e.g., "about 10km")\n- Do NOT list delivery rates or pricing tiers.\n- Do NOT give lengthy instructions - keep it brief and conversational.\n- Example: "I couldn't find that exact spot. Could you share your location pin on WhatsApp? Or tell me roughly how many km you are from Kisumu town?"\n`;
    }

    if (deliveryQuote) {
      const cartTotal = state.cart.reduce((sum, item) => sum + item.totalPrice, 0);
      let info = `\n# DELIVERY CALCULATION (from our system - use these EXACT numbers)\n`;
      info += `- Customer location: ${deliveryQuote.locationName}\n`;
      info += `- Distance from Kisumu: ${deliveryQuote.distanceKm} km\n`;
      info += `- Delivery zone: ${deliveryQuote.zone}\n`;
      info += `- Delivery fee: KES ${deliveryQuote.fee}\n`;

      if (deliveryQuote.zone === 'far' && cartTotal < 5000) {
        info += `- ⚠️ Order total (KES ${cartTotal}) is below minimum KES 5,000 for this distance. Politely ask customer to add more items or choose a closer location.\n`;
      } else if (deliveryQuote.zone === 'far') {
        info += `- ✅ Order total (KES ${cartTotal}) meets the minimum for this distance.\n`;
      }

      info += `- IMPORTANT: Use the delivery fee above in the order summary. Do NOT guess or calculate your own fee.\n`;
      return info;
    }

    if (state.deliveryFee !== undefined && state.deliveryLocation) {
      return `\n# DELIVERY INFO (already calculated)\n- Location: ${state.deliveryLocation}\n- Distance: ${state.deliveryDistanceKm} km\n- Fee: KES ${state.deliveryFee}\n`;
    }

    return '';
  }

  private formatCartSummary(cart: any[]): string {
    if (cart.length === 0) {
      return '# CURRENT CART\nEmpty - customer has not added any items yet';
    }

    const items = cart
      .map(
        (item) =>
          `- ${item.productName}: ${item.quantity} ${item.unit} × KES ${item.unitPrice} = KES ${item.totalPrice}`
      )
      .join('\n');

    const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    return `# CURRENT CART\n${items}\n\nTotal: KES ${total}`;
  }

}
