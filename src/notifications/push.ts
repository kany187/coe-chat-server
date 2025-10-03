import { Expo, ExpoPushMessage, ExpoPushTicket } from "expo-server-sdk";
import { NotificationMessage, PushNotificationPayload } from './types';
import { djangoClient } from '../django/client';

// Initialize Expo SDK
const expo = new Expo();
const tickets: ExpoPushTicket[] = [];

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
    const tokens = await djangoClient.getPushTokens(userId);
    return tokens.map(token => token.token);
  } catch (error) {
    console.error('Error fetching push tokens:', error);
    return [];
  }
}

/**
 * Create Expo push messages from tokens and message data
 */
export const createMessages = (
  pushTokens: string[],
  body: string,
  conversationID: number,
  senderName: string,
  propertyTitle?: string
): ExpoPushMessage[] => {
  const messages: ExpoPushMessage[] = [];
  
  for (const token of pushTokens) {
    // Validate Expo push token
    if (!Expo.isExpoPushToken(token)) {
      console.error(`Push token ${token} is not a valid Expo push token`);
      continue;
    }

    messages.push({
      to: token,
      sound: "default",
      body,
      title: senderName,
      // Deep link to conversation
      data: {
        url: `exp://${process.env.EXPO_DEV_SERVER || '192.168.30.24:19000'}/--/messages/${conversationID}/${senderName}`,
        conversationId: conversationID.toString(),
        senderName,
        propertyTitle: propertyTitle || '',
        type: 'message'
      },
    });
  }

  return messages;
};

/**
 * Send push notifications using Expo SDK
 */
export const sendNotifications = async (messages: ExpoPushMessage[]): Promise<void> => {
  if (messages.length === 0) {
    return;
  }

  try {
    // Chunk notifications for better performance
    const chunks = expo.chunkPushNotifications(messages);
    
    // Send chunks sequentially to avoid rate limits
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Push notification tickets:', ticketChunk);
        tickets.push(...ticketChunk);
        
        // Handle individual ticket errors
        for (const ticket of ticketChunk) {
          if (ticket.status === 'error') {
            console.error('Push notification error:', ticket.details?.error);
          }
        }
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }
  } catch (error) {
    console.error('Error in sendNotifications:', error);
  }
};

/**
 * Validate push notification receipts
 * Should be called periodically (e.g., every 30 minutes)
 */
export const validateReceipts = async (): Promise<void> => {
  const receiptIds: string[] = [];
  
  // Collect receipt IDs from tickets
  for (const ticket of tickets) {
    if (ticket.status === 'ok' && ticket.id) {
      receiptIds.push(ticket.id);
    }
  }

  if (receiptIds.length === 0) {
    return;
  }

  try {
    // Chunk receipt IDs
    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    
    // Process receipt chunks
    for (const chunk of receiptIdChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        console.log('Push notification receipts:', receipts);

        // Handle receipt status
        for (const receiptId in receipts) {
          const { status, details } = receipts[receiptId];
          
          if (status === 'ok') {
            console.log(`Push notification ${receiptId} delivered successfully`);
          } else if (status === 'error') {
            console.error(`Push notification ${receiptId} failed:`, details?.error);
            
            // Handle specific error codes
            if (details?.error) {
              switch (details.error) {
                case 'DeviceNotRegistered':
                  console.log('Device token is no longer valid, should be removed from database');
                  break;
                case 'MessageTooBig':
                  console.log('Message payload is too large');
                  break;
                case 'MessageRateExceeded':
                  console.log('Message rate exceeded, should retry later');
                  break;
                default:
                  console.log(`Unknown error: ${details.error}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing receipt chunk:', error);
      }
    }
  } catch (error) {
    console.error('Error validating receipts:', error);
  }
};

/**
 * Send notification for new conversation
 */
export const sendNewConversationNotification = async (
  userID: number,
  senderName: string,
  propertyTitle: string,
  messageText: string,
  conversationID: number
): Promise<void> => {
  try {
    const tokens = await getPushTokens(userID);
    
    if (tokens.length === 0) {
      console.log('No push tokens found for user:', userID);
      return;
    }

    const messages = createMessages(
      tokens,
      messageText,
      conversationID,
      senderName,
      propertyTitle
    );

    await sendNotifications(messages);
    console.log(`New conversation notification sent to user ${userID}`);
  } catch (error) {
    console.error('Error sending new conversation notification:', error);
  }
};

/**
 * Send notification for new message
 */
export const sendMessageNotification = async (
  userID: number,
  senderName: string,
  messageText: string,
  conversationID: number,
  propertyTitle?: string
): Promise<void> => {
  try {
    const tokens = await getPushTokens(userID);
    
    if (tokens.length === 0) {
      console.log('No push tokens found for user:', userID);
      return;
    }

    const messages = createMessages(
      tokens,
      messageText,
      conversationID,
      senderName,
      propertyTitle
    );

    await sendNotifications(messages);
    console.log(`Message notification sent to user ${userID}`);
  } catch (error) {
    console.error('Error sending message notification:', error);
  }
};

/**
 * Setup periodic receipt validation
 * Call this once when the server starts
 */
export const setupReceiptValidation = (): void => {
  // Validate receipts every 30 minutes
  setInterval(() => {
    validateReceipts();
  }, 30 * 60 * 1000); // 30 minutes

  console.log('Receipt validation scheduled every 30 minutes');
};
