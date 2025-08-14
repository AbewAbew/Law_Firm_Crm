import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private prisma: PrismaService) {}

  async sendInvoiceEmail(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        case: true,
        timeEntries: { include: { user: true } },
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    try {
      // Create transporter (using Gmail as example)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password',
        },
      });

      // Generate invoice content
      const emailContent = this.generateInvoiceEmail(invoice);

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: invoice.client.email,
        subject: `Invoice ${invoice.invoiceNumber} - ${invoice.case.caseName}`,
        html: emailContent,
      });

      // Update invoice status to SENT
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { 
          status: 'SENT',
          issueDate: new Date(),
        },
      });

      return {
        message: `Invoice ${invoice.invoiceNumber} sent to ${invoice.client.email}`,
        sentTo: invoice.client.email,
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send invoice email');
    }
  }

  private generateInvoiceEmail(invoice: any): string {
    const timeEntriesHtml = invoice.timeEntries.map(entry => `
      <tr>
        <td>${entry.description}</td>
        <td>${(entry.duration / 60).toFixed(1)} hours</td>
        <td>$${entry.rate}</td>
        <td>$${((entry.duration / 60) * entry.rate).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Invoice ${invoice.invoiceNumber}</h2>
          <p><strong>Case:</strong> ${invoice.case.caseName}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Description</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Hours</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Rate</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${timeEntriesHtml}
            </tbody>
          </table>
          
          <div style="text-align: right; margin-top: 20px;">
            <p><strong>Subtotal: $${invoice.subtotal.toFixed(2)}</strong></p>
            <p><strong>Tax: $${invoice.tax.toFixed(2)}</strong></p>
            <p style="font-size: 18px;"><strong>Total: $${invoice.total.toFixed(2)}</strong></p>
          </div>
          
          ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ''}
          
          <p style="margin-top: 30px; color: #666;">
            Please remit payment by the due date. Thank you for your business.
          </p>
        </body>
      </html>
    `;
  }

  async sendLoginCredentials(clientEmail: string, clientName: string, password: string, caseName: string) {
    try {
      // Create transporter (using Gmail as example)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password',
        },
      });

      // Generate login credentials content
      const emailContent = this.generateLoginCredentialsEmail(clientName, clientEmail, password, caseName);

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: clientEmail,
        subject: 'Your Legal Portal Access - Login Credentials',
        html: emailContent,
      });

      return {
        message: `Login credentials sent to ${clientEmail}`,
        sentTo: clientEmail,
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new Error('Failed to send login credentials email');
    }
  }

  private generateLoginCredentialsEmail(clientName: string, email: string, password: string, caseName: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #00C49F;">Welcome to Our Legal Portal</h2>
          
          <p>Dear ${clientName},</p>
          
          <p>Your case "<strong>${caseName}</strong>" has been created and you now have access to our client portal where you can:</p>
          
          <ul>
            <li>View your case details and progress</li>
            <li>Access important documents</li>
            <li>Schedule appointments</li>
            <li>Communicate with your legal team</li>
          </ul>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Your Login Credentials:</h3>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Portal URL:</strong> <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login">${process.env.FRONTEND_URL || 'http://localhost:3000'}/login</a></p>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Security Note:</strong> Please change your password after your first login for security purposes.
          </p>
          
          <p>If you have any questions or need assistance accessing the portal, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>Your Legal Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #999;">
            This email contains sensitive information. Please keep your login credentials secure and do not share them with others.
          </p>
        </body>
      </html>
    `;
  }
}