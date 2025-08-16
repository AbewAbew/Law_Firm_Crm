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
        <td style="border: 1px solid #000; padding: 8px; font-size: 14px;">
          ${new Date(entry.startTime || new Date()).toLocaleDateString()}
        </td>
        <td style="border: 1px solid #000; padding: 8px; font-size: 14px; text-align: center;">
          ${entry.user?.name?.split(' ').map(n => n[0]).join('') || 'DB'}
        </td>
        <td style="border: 1px solid #000; padding: 8px; font-size: 14px;">
          ${entry.description || 'PHONE CALL:'}
        </td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 14px;">
          ${entry.duration ? (entry.duration / 60).toFixed(2) : '0.00'}
        </td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 14px;">
          $${entry.rate?.toFixed(2) || '0.00'}/hr
        </td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 14px;">
          $${entry.billableAmount?.toFixed(2) || '0.00'}
        </td>
      </tr>
    `).join('');

    const logoHtml = process.env.LOGO_URL 
      ? `<img src="${process.env.LOGO_URL}" alt="Company Logo" style="height: 80px; margin-bottom: 10px; margin-left: -10px;" />`
      : `<div style="width: 80px; height: 80px; background: linear-gradient(135deg, #1e40af, #dc2626); margin-bottom: 10px; margin-left: -10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; border-radius: 8px;">MLA</div>`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice ${invoice.invoiceNumber}</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 850px; margin: 0 auto; padding: 20px; background-color: #ffffff; color: #333;">
          
          <!-- Header Section -->
          <table style="width: 100%; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #000;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                ${logoHtml}
                <h2 style="font-weight: bold; color: #333; margin: 0; font-size: 24px;">Your Law Firm Name</h2>
                <div style="color: #666; margin-top: 5px; font-size: 14px;">
                  123 Legal Street<br/>
                  City, State 12345<br/>
                  Phone: (555) 123-4567
                </div>
              </td>
              <td style="vertical-align: top; text-align: right; width: 50%;">
                <h1 style="font-weight: normal; color: #ccc; letter-spacing: 2px; margin: 0; font-size: 48px;">INVOICE</h1>
              </td>
            </tr>
          </table>

          <!-- Client and Invoice Info -->
          <table style="width: 100%; margin-bottom: 30px;">
            <tr>
              <td style="vertical-align: top; width: 50%;">
                <h3 style="font-weight: bold; margin-bottom: 10px; color: #333;">Bill To:</h3>
                <div>
                  ${invoice.client?.name}<br/>
                  <a href="mailto:${invoice.client?.email}" style="color: #0066cc; text-decoration: none;">${invoice.client?.email}</a>
                </div>
              </td>
              <td style="vertical-align: top; text-align: right; width: 50%;">
                <table style="border-collapse: collapse; border: 1px solid #000; margin-left: auto;">
                  <tr>
                    <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; font-weight: bold;">Invoice Date</td>
                    <td style="border: 1px solid #000; padding: 8px;">${new Date(invoice.issueDate).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; font-weight: bold;">Invoice Number</td>
                    <td style="border: 1px solid #000; padding: 8px;">${invoice.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; font-weight: bold;">Terms</td>
                    <td style="border: 1px solid #000; padding: 8px;">Net 30</td>
                  </tr>
                  <tr>
                    <td style="border: 1px solid #000; padding: 8px; background-color: #f5f5f5; font-weight: bold;">Due Date</td>
                    <td style="border: 1px solid #000; padding: 8px;">${new Date(invoice.dueDate).toLocaleDateString()}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Case Reference -->
          <p style="margin-bottom: 20px; font-weight: bold;">
            In Reference To: ${invoice.case?.caseName}
          </p>

          <!-- Services Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #4472C4; color: white;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Date</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center;">By</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left;">Services</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Hours</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Rate</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${timeEntriesHtml}
            </tbody>
          </table>

          <!-- Totals Section -->
          <div style="float: right; clear: both; margin-top: 20px; margin-bottom: 20px;">
            <table style="border-collapse: collapse; text-align: right;">
              <tr>
                <td style="padding: 8px 20px; text-align: right; font-weight: bold;">Total Hours</td>
                <td style="padding: 8px 20px; text-align: right; border-bottom: 1px solid #000;">${(invoice.timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60).toFixed(0)} hrs</td>
              </tr>
              <tr>
                <td style="padding: 8px 20px; text-align: right; font-weight: bold;">Total Professional Services</td>
                <td style="padding: 8px 20px; text-align: right; border-bottom: 1px solid #000;">$${invoice.subtotal?.toFixed(2) || '0.00'}</td>
              </tr>
              ${invoice.tax > 0 ? `
              <tr>
                <td style="padding: 8px 20px; text-align: right; font-weight: bold;">Tax</td>
                <td style="padding: 8px 20px; text-align: right; border-bottom: 1px solid #000;">$${invoice.tax?.toFixed(2) || '0.00'}</td>
              </tr>
              ` : ''}
            </table>
            <div style="border: 2px solid #000; padding: 10px; background-color: #f5f5f5; margin-top: 10px; text-align: center;">
              <span style="font-weight: bold; font-size: 18px;">Balance (Amount Due)</span>
              <span style="margin-left: 20px; font-weight: bold; font-size: 18px; color: #4472C4;">$${invoice.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          <div style="clear: both;"></div>

          ${invoice.notes ? `
          <div style="margin-top: 30px;">
            <strong>Notes:</strong> ${invoice.notes}
          </div>
          ` : ''}
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