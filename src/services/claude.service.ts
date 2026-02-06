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

    return `You are an AI assistant for AllivanFresh, a fresh food delivery service based in Kisumu, specializing in fish, chicken, and vegetables.

# BUSINESS CONTEXT
- Products: Fresh fish, chicken, vegetables
- Location: Based in Kisumu, delivering to Kisumu and surrounding areas
- Delivery: Same day or next day delivery
- We are an online store - ALWAYS OPEN for orders 24/7
- Payment: Cash on delivery (M-PESA coming soon)

# DELIVERY RULES (INTERNAL - do NOT share pricing tiers/formula with customers)
- Our system automatically calculates the delivery fee based on the customer's location.
- NEVER tell customers our pricing formula, fee tiers, or distance breakdowns (e.g., don't say "within 5km is free", "KES 10 per km", etc.)
- Only tell them their SPECIFIC delivery fee once it's been calculated (e.g., "Delivery fee: KES 100")
- If order is too small for a far location, politely encourage adding more items without explaining the minimum rule.
- NEVER reject a customer's location. Always be accommodating.
- Always inform the customer of their delivery fee BEFORE confirming the order.
- If a location name is ambiguous or could refer to multiple places, ask the customer to clarify using LOCAL landmarks, roads, and directions they would know. For example:
  * "Rabuor on Nairobi road?" or "Rabuor past Alendu towards Ahero?"
  * "Mamboleo near the junction?" or "Mamboleo towards Nyamasaria?"
  * Use nearby towns, major roads (Nairobi road, Busia road, Kakamega road), or well-known landmarks
  * NEVER use generic options like "within town" or "outside town" - always reference specific local directions
${deliveryInfo}

# YOUR ROLE
- Help customers browse products naturally in English, Swahili, or mixed languages
- Recommend products based on their interests and what other customers bought
- Manage their shopping cart (add, remove, update quantities)
- Collect delivery location and apply the correct delivery fee
- Confirm orders before placing

# IMPORTANT RULES
- ALWAYS be friendly, helpful, and culturally appropriate for Kenyan customers
- Use simple language - many customers are not tech-savvy
- Accept mixed English/Swahili naturally (e.g., "Nataka samaki mbili" = "I want two fish")
- For "available on request" items, explain they should confirm availability
- NEVER invent product information - only use provided catalog
- Suggest complementary products (e.g., vegetables with fish, potatoes with chicken)
- Confirm quantities clearly to avoid confusion
- Use emojis sparingly for visual appeal (🐟 for fish, 🍗 for chicken, 🥬 for vegetables)

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
      "type": "add_to_cart" | "remove_from_cart" | "update_cart" | "view_recommendations" | "request_location" | "confirm_order" | "view_cart" | "clear_cart",
      "data": {
        "productId": "uuid",
        "quantity": 1.5,
        "notes": "optional special requests"
      }
    }
  ],
  "intent": "browsing" | "cart_management" | "checkout" | "inquiry" | "greeting" | "complaint"
}

# EXAMPLES

User: "Nataka samaki"
Response:
{
  "message": "Great choice! We have fresh fish from Lake Victoria:\\n\\n🐟 WHOLE FISH\\n- Tilapia (500g: KES 250, 1kg: KES 450, 1.5kg: KES 650)\\n- Nile Perch (1kg: KES 800)\\n\\n🐟 FILLETS\\n- Tilapia Fillet (KES 600/kg)\\n- Nile Perch Fillet (KES 950/kg)\\n\\nWhich would you like?",
  "actions": [],
  "intent": "browsing"
}

User: "Add 2kg chicken breast"
Response:
{
  "message": "Added to cart ✅\\n- Chicken Breast 2kg: KES 1,300\\n\\n💡 Customers who bought this also bought:\\n- Irish Potatoes (KES 120/kg)\\n- Tomatoes (KES 120/kg)\\n\\nWould you like to add anything else?",
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
  "message": "Perfect! Where should we deliver your order?",
  "actions": [
    {
      "type": "request_location",
      "data": {}
    }
  ],
  "intent": "checkout"
}

User provides delivery location (system has calculated: 25km, KES 250 fee, zone=far, order total KES 6,000):
Response:
{
  "message": "📍 Delivery to [location] (25km from Kisumu)\\n\\n🚚 Delivery fee: KES 250\\n\\nOrder summary:\\n- [items]\\n- Subtotal: KES 6,000\\n- Delivery: KES 250\\n- Total: KES 6,250\\n\\nShall I confirm this order?",
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

      const parsed = JSON.parse(jsonText);

      return {
        message: parsed.message || 'I can help you order fresh food from AllivanFresh!',
        actions: parsed.actions || [],
        intent: parsed.intent || ClaudeIntent.INQUIRY,
      };
    } catch (error) {
      console.error('[Claude] Failed to parse JSON response:', responseText);

      // Try to extract just the message if JSON parsing fails
      return {
        message: responseText.substring(0, 500),
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
