import { config } from '../config/env';

/**
 * Check if current time is within business hours
 * Business hours: 8am - 6pm EAT (Africa/Nairobi timezone)
 */
export const isBusinessHoursOpen = (): boolean => {
  const now = new Date();

  // Convert to Nairobi time
  const nairobiTime = new Date(
    now.toLocaleString('en-US', { timeZone: config.TIMEZONE })
  );

  const currentHour = nairobiTime.getHours();

  return (
    currentHour >= config.BUSINESS_HOURS_START &&
    currentHour < config.BUSINESS_HOURS_END
  );
};

/**
 * Get business hours message
 */
export const getBusinessHoursMessage = (): string => {
  return `We're open ${config.BUSINESS_HOURS_START}am - ${config.BUSINESS_HOURS_END}pm EAT, Monday to Sunday.`;
};

/**
 * Get closed message
 */
export const getClosedMessage = (): string => {
  return `Habari! AllivanFresh is currently closed. ${getBusinessHoursMessage()} We'll be happy to help you when we reopen! 😊`;
};

/**
 * Get next delivery date (tomorrow)
 */
export const getNextDeliveryDate = (): Date => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0); // Default 10am delivery
  return tomorrow;
};

/**
 * Format date for display
 */
export const formatDeliveryDate = (date: Date): string => {
  return date.toLocaleDateString('en-KE', {
    timeZone: config.TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
