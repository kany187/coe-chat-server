import { NotificationMessage, PushNotificationPayload } from './types';

export interface PushProvider {
  sendPushNotification(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendBatchPushNotifications(messages: NotificationMessage[]): Promise<{ successCount: number; failureCount: number; results: any[] }>;
}

class FirebasePushProvider implements PushProvider {
  private serverKey: string;
  private projectId: string;

  constructor() {
    this.serverKey = process.env.FIREBASE_SERVER_KEY || '';
    this.projectId = process.env.FIREBASE_PROJECT_ID || '';
  }

  async sendPushNotification(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.serverKey) {
        throw new Error('Firebase Server Key not configured');
      }

      const payload: PushNotificationPayload = {
        notification: {
          title: message.title,
          body: message.body,
        },
        data: message.data,
        token: message.token,
      };

      const response = await fetch(`https://fcm.googleapis.com/fcm/send`, {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.serverKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Push notification failed: ${error}`);
      }

      const result = await response.json();
      
      if (result.failure > 0) {
        const error = result.results?.[0]?.error || 'Unknown error';
        return {
          success: false,
          error,
        };
      }

      return {
        success: true,
        messageId: result.message_id,
      };
    } catch (error) {
      console.error('Push notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBatchPushNotifications(messages: NotificationMessage[]): Promise<{ successCount: number; failureCount: number; results: any[] }> {
    try {
      if (!this.serverKey) {
        throw new Error('Firebase Server Key not configured');
      }

      // Firebase FCM supports up to 500 tokens per request
      const batchSize = 500;
      const batches = [];
      
      for (let i = 0; i < messages.length; i += batchSize) {
        batches.push(messages.slice(i, i + batchSize));
      }

      let totalSuccessCount = 0;
      let totalFailureCount = 0;
      const allResults: any[] = [];

      for (const batch of batches) {
        const tokens = batch.map(msg => msg.token);
        const firstMessage = batch[0]; // Use first message as template for batch

        const payload = {
          notification: {
            title: firstMessage.title,
            body: firstMessage.body,
          },
          data: firstMessage.data,
          registration_ids: tokens,
        };

        const response = await fetch(`https://fcm.googleapis.com/fcm/send`, {
          method: 'POST',
          headers: {
            'Authorization': `key=${this.serverKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Batch push notification failed: ${error}`);
        }

        const result = await response.json();
        
        totalSuccessCount += result.success || 0;
        totalFailureCount += result.failure || 0;
        allResults.push(...(result.results || []));
      }

      return {
        successCount: totalSuccessCount,
        failureCount: totalFailureCount,
        results: allResults,
      };
    } catch (error) {
      console.error('Batch push notification error:', error);
      return {
        successCount: 0,
        failureCount: messages.length,
        results: messages.map(() => ({ error: error instanceof Error ? error.message : 'Unknown error' })),
      };
    }
  }
}

class ExpoPushProvider implements PushProvider {
  private accessToken?: string;

  constructor() {
    this.accessToken = process.env.EXPO_ACCESS_TOKEN;
  }

  async sendPushNotification(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const payload = {
        to: message.token,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: 'default',
        priority: 'high',
      };

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Expo push notification failed: ${error}`);
      }

      const result = await response.json();
      
      if (result.data?.status === 'error') {
        return {
          success: false,
          error: result.data?.message || 'Expo push notification failed',
        };
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error('Expo push notification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendBatchPushNotifications(messages: NotificationMessage[]): Promise<{ successCount: number; failureCount: number; results: any[] }> {
    try {
      const payloads = messages.map(message => ({
        to: message.token,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: 'default',
        priority: 'high',
      }));

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(payloads),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Expo batch push notification failed: ${error}`);
      }

      const results = await response.json();
      
      let successCount = 0;
      let failureCount = 0;

      results.forEach((result: any) => {
        if (result.status === 'ok') {
          successCount++;
        } else {
          failureCount++;
        }
      });

      return {
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      console.error('Expo batch push notification error:', error);
      return {
        successCount: 0,
        failureCount: messages.length,
        results: messages.map(() => ({ error: error instanceof Error ? error.message : 'Unknown error' })),
      };
    }
  }
}

// Factory function to create the appropriate push provider
export function createPushProvider(): PushProvider {
  const provider = process.env.PUSH_PROVIDER?.toLowerCase() || 'firebase';
  
  switch (provider) {
    case 'expo':
      return new ExpoPushProvider();
    case 'firebase':
    default:
      return new FirebasePushProvider();
  }
}

// Main functions to send push notifications
export async function sendPushNotification(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const provider = createPushProvider();
  return provider.sendPushNotification(message);
}

export async function sendBatchPushNotifications(messages: NotificationMessage[]): Promise<{ successCount: number; failureCount: number; results: any[] }> {
  const provider = createPushProvider();
  return provider.sendBatchPushNotifications(messages);
}

// Helper function to get push tokens for a user from Django
export async function getPushTokens(userId: number): Promise<string[]> {
  try {
    const { djangoClient } = await import('../django/client');
    const tokens = await djangoClient.getPushTokens(userId);
    return tokens.map(token => token.token);
  } catch (error) {
    console.error('Error fetching push tokens:', error);
    return [];
  }
}
