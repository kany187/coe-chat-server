"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmailProvider = createEmailProvider;
exports.sendEmailNotification = sendEmailNotification;
class ResendEmailProvider {
    constructor() {
        this.apiKey = process.env.RESEND_API_KEY || '';
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@congo-estate.com';
    }
    sendEmail(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.apiKey) {
                    throw new Error('Resend API key not configured');
                }
                const response = yield fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: this.fromEmail,
                        to: data.to,
                        subject: data.subject,
                        html: this.generateEmailTemplate(data),
                    }),
                });
                if (!response.ok) {
                    const error = yield response.text();
                    throw new Error(`Email sending failed: ${error}`);
                }
                const result = yield response.json();
                return {
                    success: true,
                    messageId: result.id,
                };
            }
            catch (error) {
                console.error('Email sending error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
    generateEmailTemplate(data) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Message - Congo Estate</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .message { background: white; padding: 15px; border-left: 4px solid #2c5aa0; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Congo Estate</h1>
              <p>New Message Notification</p>
            </div>
            <div class="content">
              <h2>New message from ${data.senderName}</h2>
              ${data.propertyTitle ? `<p><strong>Property:</strong> ${data.propertyTitle}</p>` : ''}
              <div class="message">
                <p>${data.content}</p>
              </div>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/messages/${data.conversationId}" class="button">
                  View Message
                </a>
              </p>
            </div>
            <div class="footer">
              <p>This email was sent from Congo Estate platform.</p>
              <p>If you don't want to receive these notifications, you can update your preferences in your account settings.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    }
}
class SendGridEmailProvider {
    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY || '';
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@congo-estate.com';
    }
    sendEmail(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.apiKey) {
                    throw new Error('SendGrid API key not configured');
                }
                const response = yield fetch('https://api.sendgrid.com/v3/mail/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        personalizations: [
                            {
                                to: [{ email: data.to }],
                                subject: data.subject,
                            },
                        ],
                        from: { email: this.fromEmail },
                        content: [
                            {
                                type: 'text/html',
                                value: this.generateEmailTemplate(data),
                            },
                        ],
                    }),
                });
                if (!response.ok) {
                    const error = yield response.text();
                    throw new Error(`Email sending failed: ${error}`);
                }
                const messageId = response.headers.get('x-message-id');
                return {
                    success: true,
                    messageId: messageId || undefined,
                };
            }
            catch (error) {
                console.error('Email sending error:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });
    }
    generateEmailTemplate(data) {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Message - Congo Estate</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .message { background: white; padding: 15px; border-left: 4px solid #2c5aa0; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 10px 20px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Congo Estate</h1>
              <p>New Message Notification</p>
            </div>
            <div class="content">
              <h2>New message from ${data.senderName}</h2>
              ${data.propertyTitle ? `<p><strong>Property:</strong> ${data.propertyTitle}</p>` : ''}
              <div class="message">
                <p>${data.content}</p>
              </div>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/messages/${data.conversationId}" class="button">
                  View Message
                </a>
              </p>
            </div>
            <div class="footer">
              <p>This email was sent from Congo Estate platform.</p>
              <p>If you don't want to receive these notifications, you can update your preferences in your account settings.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    }
}
function createEmailProvider() {
    var _a;
    const provider = ((_a = process.env.EMAIL_PROVIDER) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || 'resend';
    switch (provider) {
        case 'sendgrid':
            return new SendGridEmailProvider();
        case 'resend':
        default:
            return new ResendEmailProvider();
    }
}
function sendEmailNotification(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = createEmailProvider();
        return provider.sendEmail(data);
    });
}
