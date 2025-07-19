import { SMSNotificationData } from './types';

export interface SMSProvider {
  sendSMS(data: SMSNotificationData): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

class TwilioSMSProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || '';
  }

  async sendSMS(data: SMSNotificationData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.accountSid || !this.authToken || !this.fromNumber) {
        throw new Error('Twilio credentials not configured');
      }

      const auth = btoa(`${this.accountSid}:${this.authToken}`);
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: data.to,
          From: this.fromNumber,
          Body: data.message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SMS sending failed: ${error}`);
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

class AfricasTalkingSMSProvider implements SMSProvider {
  private apiKey: string;
  private username: string;
  private from: string;

  constructor() {
    this.apiKey = process.env.AFRICASTALKING_API_KEY || '';
    this.username = process.env.AFRICASTALKING_USERNAME || '';
    this.from = process.env.AFRICASTALKING_FROM || 'CongoEstate';
  }

  async sendSMS(data: SMSNotificationData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.apiKey || !this.username) {
        throw new Error('Africa\'s Talking credentials not configured');
      }

      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'apiKey': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: this.username,
          to: data.to,
          from: this.from,
          message: data.message,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SMS sending failed: ${error}`);
      }

      const result = await response.json();
      return {
        success: true,
        messageId: result.SMSMessageData?.Recipients?.[0]?.messageId,
      };
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Factory function to create the appropriate SMS provider
export function createSMSProvider(): SMSProvider {
  const provider = process.env.SMS_PROVIDER?.toLowerCase() || 'twilio';
  
  switch (provider) {
    case 'africastalking':
      return new AfricasTalkingSMSProvider();
    case 'twilio':
    default:
      return new TwilioSMSProvider();
  }
}

// Main function to send SMS notifications
export async function sendSMSNotification(data: SMSNotificationData): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const provider = createSMSProvider();
  return provider.sendSMS(data);
}
