/**
 * Application constants and business rules
 */

// Conversation steps
export enum ConversationStep {
  GREETING = 'greeting',
  BROWSING = 'browsing',
  CART_MANAGEMENT = 'cart_management',
  REQUESTING_LOCATION = 'requesting_location',
  CONFIRMING_ORDER = 'confirming_order',
  ORDER_PLACED = 'order_placed',
}

// Claude action types
export enum ClaudeActionType {
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  UPDATE_CART = 'update_cart',
  VIEW_RECOMMENDATIONS = 'view_recommendations',
  REQUEST_LOCATION = 'request_location',
  CONFIRM_ORDER = 'confirm_order',
  VIEW_CART = 'view_cart',
  CLEAR_CART = 'clear_cart',
  SHOW_PRODUCTS = 'show_products',
}

// Claude intent types
export enum ClaudeIntent {
  GREETING = 'greeting',
  BROWSING = 'browsing',
  CART_MANAGEMENT = 'cart_management',
  CHECKOUT = 'checkout',
  INQUIRY = 'inquiry',
  COMPLAINT = 'complaint',
}

// Business configuration
export const BUSINESS_CONFIG = {
  name: 'AllivanFresh',
  tagline: 'Fresh to your door in Kisumu',
  deliveryArea: 'Kisumu',
  sourceLocation: 'Kisumu',
  deliveryModel: 'next-day',
  paymentMethod: 'cash-on-delivery',
} as const;

// Recommendation settings
export const RECOMMENDATION_CONFIG = {
  maxRecommendations: 3,
  minStrength: 2.0,
  defaultStrength: 1.0,
} as const;

// Cart settings
export const CART_CONFIG = {
  maxItems: 20,
  maxQuantityPerItem: 10,
} as const;

// Message settings
export const MESSAGE_CONFIG = {
  maxMessageLength: 1000,
  maxHistoryLength: 10,
} as const;

// Order settings
export const ORDER_CONFIG = {
  orderNumberPrefix: 'AFN',
  defaultDeliveryTimeHours: 10, // 10am next day
} as const;
