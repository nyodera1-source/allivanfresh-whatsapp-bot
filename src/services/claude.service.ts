import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/env';
import { ConversationState } from '../models/conversation-state';
import { ClaudeActionType, ClaudeIntent } from '../config/constants';

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
    messageHistory: Array<{ role: string; content: string }> = []
  ): Promise<ClaudeResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(state, productCatalog, recommendations);

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
    recommendations: string
  ): string {
    const cartSummary = this.formatCartSummary(state.cart);

    return `You are an AI assistant for AllivanFresh, a fresh food delivery service based in Kisumu, specializing in fish, chicken, and vegetables.

# BUSINESS CONTEXT
- Products: Fresh fish, chicken, vegetables
- Location: Based in Kisumu, delivering within Kisumu town
- Delivery: Same day or next day delivery within Kisumu
- We are an online store - ALWAYS OPEN for orders 24/7
- Payment: Cash on delivery (M-PESA coming soon)

# YOUR ROLE
- Help customers browse products naturally in English, Swahili, or mixed languages
- Recommend products based on their interests and what other customers bought
- Manage their shopping cart (add, remove, update quantities)
- Collect delivery location in Kisumu
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
  "message": "Perfect! Where in Kisumu should we deliver?",
  "actions": [
    {
      "type": "request_location",
      "data": {}
    }
  ],
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
