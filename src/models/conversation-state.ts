import { ConversationStep } from '../config/constants';

/**
 * Shopping cart item
 */
export interface CartItem {
  productId: string;
  productName: string;
  productNameSwahili?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
  notes?: string;
}

/**
 * Conversation state structure
 */
export interface ConversationState {
  step: ConversationStep;
  cart: CartItem[];
  deliveryLocation?: string;
  deliveryNotes?: string;
  lastProductViewed?: string;
  language: 'en' | 'sw' | 'mixed';
  pendingAction?: {
    type: string;
    data: any;
  };
}

/**
 * Message in conversation history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Default conversation state
 */
export const getDefaultState = (): ConversationState => ({
  step: ConversationStep.GREETING,
  cart: [],
  language: 'mixed',
});
