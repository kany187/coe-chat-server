export type NotificationMessage = {
    token: string;
    title: string;
    body: string;
    data: {
      conversationId: string;
      senderName: string;
      type: string;
      propertyTitle?: string;
      appointmentDate?: string;
      [key: string]: any;
    };
  }
  
  export type PushNotificationPayload = {
    notification: {
      title: string;
      body: string;
    };
    data: {
      [key: string]: string;
    };
    token: string;
  }
  
  export type EmailNotificationData = {
    to: string;
    subject: string;
    content: string;
    senderName: string;
    conversationId: number;
    propertyTitle?: string;
  }
  
  export type SMSNotificationData = {
    to: string;
    message: string;
    senderName: string;
    conversationId: number;
  }
  
  export type UserPreferences = {
    userId: number;
    email?: string;
    phoneNumber?: string;
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    quietHoursStart?: string; // "22:00"
    quietHoursEnd?: string;   // "08:00"
    timezone?: string;
  }
  
  export type NotificationType = 
    | 'message' 
    | 'new_conversation' 
    | 'appointment' 
    | 'property_update' 
    | 'offer_received' 
    | 'offer_accepted'
    | 'offer_rejected';
  
  export type NotificationResult = {
    success: boolean;
    messageId?: string;
    error?: string;
  }
  
  export type BatchNotificationResult = {
    successCount: number;
    failureCount: number;
    results: NotificationResult[];
  }