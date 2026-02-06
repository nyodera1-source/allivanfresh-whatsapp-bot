import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { Order, OrderItem, Product, Customer } from '@prisma/client';

type OrderWithDetails = Order & {
  items: (OrderItem & { product: Product })[];
  customer: Customer;
};

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.GMAIL_USER,
        pass: config.GMAIL_APP_PASSWORD,
      },
    });
  }

  /**
   * Send order notification email
   */
  async sendOrderEmail(order: OrderWithDetails): Promise<boolean> {
    try {
      const emailHtml = this.buildOrderEmailHtml(order);

      const info = await this.transporter.sendMail({
        from: `"AllivanFresh" <${config.GMAIL_USER}>`,
        to: config.ORDER_EMAIL_RECIPIENT,
        subject: `New Order ${order.orderNumber} - ${order.customer.phoneNumber}`,
        html: emailHtml,
      });

      console.log(`[Email] Order email sent: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Email] Failed to send order email:', error.message);
      return false;
    }
  }

  /**
   * Build HTML email template
   */
  private buildOrderEmailHtml(order: OrderWithDetails): string {
    const itemsHtml = order.items
      .map(
        (item) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 12px;">${item.product.name}</td>
        <td style="border: 1px solid #ddd; padding: 12px;">${item.quantity}</td>
        <td style="border: 1px solid #ddd; padding: 12px;">KES ${item.unitPrice}</td>
        <td style="border: 1px solid #ddd; padding: 12px;">KES ${item.totalPrice}</td>
        <td style="border: 1px solid #ddd; padding: 12px;">${item.notes || '-'}</td>
      </tr>
    `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .header {
      background: #2ecc71;
      color: white;
      padding: 20px;
      text-align: center;
    }
    .content {
      padding: 20px;
    }
    .section {
      margin: 20px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .items-table th {
      background: #f4f4f4;
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    .items-table td {
      border: 1px solid #ddd;
      padding: 12px;
    }
    .total {
      font-size: 1.3em;
      font-weight: bold;
      text-align: right;
      margin: 20px 0;
      color: #2ecc71;
    }
    .info-box {
      background: #f9f9f9;
      border-left: 4px solid #2ecc71;
      padding: 15px;
      margin: 10px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #777;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐟 New Order - AllivanFresh</h1>
    <h2>${order.orderNumber}</h2>
  </div>

  <div class="content">
    <div class="section">
      <div class="section-title">📱 Customer Details</div>
      <div class="info-box">
        <strong>Phone:</strong> ${order.customer.phoneNumber}<br>
        ${order.customer.firstName ? `<strong>Name:</strong> ${order.customer.firstName} ${order.customer.lastName || ''}<br>` : ''}
        <strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString('en-KE', {
          timeZone: config.TIMEZONE,
        })}<br>
        <strong>Delivery Date:</strong> ${new Date(order.deliveryDate).toLocaleDateString('en-KE', {
          timeZone: config.TIMEZONE,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </div>
    </div>

    <div class="section">
      <div class="section-title">📍 Delivery Location</div>
      <div class="info-box">
        ${order.deliveryLocation}
        ${order.deliveryNotes ? `<br><strong>Notes:</strong> ${order.deliveryNotes}` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">🛒 Order Items</div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="total">
        TOTAL: KES ${order.totalAmount}
      </div>
    </div>

    <div class="section">
      <div class="section-title">💳 Payment</div>
      <div class="info-box">
        <strong>Method:</strong> Cash on Delivery
      </div>
    </div>

    <div class="footer">
      <p><strong>Order received via WhatsApp Bot</strong></p>
      <p>Order ID: ${order.id}</p>
      <p>Timestamp: ${new Date().toISOString()}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('[Email] Connection verified successfully');
      return true;
    } catch (error: any) {
      console.error('[Email] Connection verification failed:', error.message);
      return false;
    }
  }
}
