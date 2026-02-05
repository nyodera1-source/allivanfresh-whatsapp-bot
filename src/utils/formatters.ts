import { CartItem } from '../models/conversation-state';

/**
 * Format price in Kenyan Shillings
 */
export const formatPrice = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format cart summary for display
 */
export const formatCartSummary = (cart: CartItem[]): string => {
  if (cart.length === 0) {
    return '🛒 Your cart is empty';
  }

  const items = cart
    .map((item, index) => {
      const name = item.productNameSwahili
        ? `${item.productName} (${item.productNameSwahili})`
        : item.productName;
      return `${index + 1}. ${name}\n   ${item.quantity} ${item.unit} × ${formatPrice(
        item.unitPrice
      )} = ${formatPrice(item.totalPrice)}${item.notes ? `\n   Note: ${item.notes}` : ''}`;
    })
    .join('\n\n');

  const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  return `🛒 *Your Cart*\n\n${items}\n\n*Total: ${formatPrice(total)}*`;
};

/**
 * Format order summary for confirmation
 */
export const formatOrderSummary = (
  cart: CartItem[],
  deliveryLocation: string,
  deliveryDate: string
): string => {
  const items = cart
    .map((item, index) => {
      return `${index + 1}. ${item.productName}\n   ${item.quantity} ${item.unit} × ${formatPrice(
        item.unitPrice
      )} = ${formatPrice(item.totalPrice)}`;
    })
    .join('\n\n');

  const total = cart.reduce((sum, item) => sum + item.totalPrice, 0);

  return `📦 *ORDER SUMMARY*\n\n${items}\n\n*Total: ${formatPrice(
    total
  )}*\n\n📍 *Delivery:* ${deliveryLocation}\n📅 *Delivery Date:* ${deliveryDate}\n💳 *Payment:* Cash on delivery\n\nReply *YES* to confirm your order, or *NO* to cancel.`;
};

/**
 * Format product for display
 */
export const formatProduct = (
  name: string,
  nameSwahili: string | null,
  price: number,
  unit: string,
  description: string
): string => {
  const productName = nameSwahili ? `${name} (${nameSwahili})` : name;
  return `*${productName}*\n${formatPrice(price)} ${unit}\n${description}`;
};

/**
 * Clean phone number (ensure it has country code)
 */
export const cleanPhoneNumber = (phone: string): string => {
  // Remove any whitespace and special characters
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // If it starts with 0, replace with +254 (Kenya country code)
  if (cleaned.startsWith('0')) {
    cleaned = '+254' + cleaned.substring(1);
  }

  // If it doesn't start with +, add +254
  if (!cleaned.startsWith('+')) {
    cleaned = '+254' + cleaned;
  }

  return cleaned;
};

/**
 * Truncate text to max length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
};
