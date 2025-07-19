import { getPushTokens, sendPushNotification, sendBatchPushNotifications } from './push';
import { sendEmailNotification } from './email';
import { sendSMSNotification } from './sms';
import { NotificationMessage, NotificationType, UserPreferences } from './types';
import { djangoClient } from '../django/client';

export * from './push';
export * from './email';
export * from './sms';
export * from './types';

/**
 * Main function to create notification messages
 */
export function createMessages(
  tokens: string[],
  messageText: string,
  conversationId: number,
  senderName: string,
  propertyTitle?: string
): NotificationMessage[] {
  const title = `New message from ${senderName}`;
  const body = messageText.length > 100 
    ? `${messageText.substring(0, 100)}...` 
    : messageText;

  return tokens.map(token => ({
    token,
    title,
    body,
    data: {
      conversationId: conversationId.toString(),
      senderName,
      type: 'message',
      propertyTitle: propertyTitle || ''
    }
  }));
}

/**
 * Send all types of notifications based on user preferences
 */
export async function sendNotifications(
  messages: NotificationMessage[],
  userId: number,
  notificationType: NotificationType = 'message',
  userPreferences?: UserPreferences
): Promise<void> {
  try {
    // Always send push notifications for real-time experience
    if (messages.length > 0) {
      await sendBatchPushNotifications(messages);
    }

    // Send email notification if user has opted in
    if (userPreferences?.emailEnabled && messages.length > 0) {
      const message = messages[0]; // Use first message as template
      await sendEmailNotification({
        to: userPreferences.email!,
        subject: message.title,
        content: message.body,
        senderName: message.data.senderName,
        conversationId: parseInt(message.data.conversationId),
        propertyTitle: message.data.propertyTitle
      });
    }

    // Send SMS notification if user has opted in
    if (userPreferences?.smsEnabled && userPreferences.phoneNumber && messages.length > 0) {
      const message = messages[0];
      await sendSMSNotification({
        to: userPreferences.phoneNumber,
        message: `${message.title}: ${message.body}`,
        senderName: message.data.senderName,
        conversationId: parseInt(message.data.conversationId)
      });
    }

  } catch (error) {
    console.error('Error sending notifications:', error);
    // Don't throw error to prevent breaking the message flow
  }
}

/**
 * Send notification for new conversation
 */
export async function sendNewConversationNotification(
  userId: number,
  senderName: string,
  propertyTitle: string,
  messageText: string,
  conversationId: number
): Promise<void> {
  try {
    const tokens = await getPushTokens(userId);
    const userPreferences = await getUserNotificationPreferences(userId);
    
    if (tokens && tokens.length > 0) {
      const messages = tokens.map(token => ({
        token,
        title: `New inquiry about ${propertyTitle}`,
        body: `${senderName}: ${messageText}`,
        data: {
          conversationId: conversationId.toString(),
          senderName,
          type: 'new_conversation',
          propertyTitle
        }
      }));

      await sendNotifications(messages, userId, 'new_conversation', userPreferences);
    }
  } catch (error) {
    console.error('Error sending new conversation notification:', error);
  }
}

/**
 * Send notification for appointment scheduling
 */
export async function sendAppointmentNotification(
  userId: number,
  senderName: string,
  propertyTitle: string,
  appointmentDate: string,
  conversationId: number
): Promise<void> {
  try {
    const tokens = await getPushTokens(userId);
    const userPreferences = await getUserNotificationPreferences(userId);
    
    if (tokens && tokens.length > 0) {
      const messages = tokens.map(token => ({
        token,
        title: `Appointment scheduled for ${propertyTitle}`,
        body: `${senderName} scheduled an appointment for ${appointmentDate}`,
        data: {
          conversationId: conversationId.toString(),
          senderName,
          type: 'appointment',
          propertyTitle,
          appointmentDate
        }
      }));

      await sendNotifications(messages, userId, 'appointment', userPreferences);
    }
  } catch (error) {
    console.error('Error sending appointment notification:', error);
  }
}

/**
 * Get user notification preferences from Django API
 */
async function getUserNotificationPreferences(userId: number): Promise<UserPreferences | undefined> {
  try {
    const preferences = await djangoClient.getNotificationPreferences(userId);
    return {
      userId: preferences.user_id,
      email: preferences.email,
      phoneNumber: preferences.phone_number,
      pushEnabled: preferences.push_enabled,
      emailEnabled: preferences.email_enabled,
      smsEnabled: preferences.sms_enabled,
      quietHoursStart: preferences.quiet_hours_start,
      quietHoursEnd: preferences.quiet_hours_end,
      timezone: preferences.timezone,
    };
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return undefined;
  }
}