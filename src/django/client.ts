import jwt from 'jsonwebtoken';

export interface DjangoUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  date_joined: string;
}

export interface DjangoConversation {
  id: number;
  property_id: number;
  buyer_id: number;
  seller_id: number;
  created_at: string;
  updated_at: string;
  property_title?: string;
}

export interface DjangoMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface DjangoNotificationPreferences {
  user_id: number;
  push_enabled: boolean;
  email_enabled: boolean;
  sms_enabled: boolean;
  email?: string;
  phone_number?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
}

export interface DjangoPushToken {
  id: number;
  user_id: number;
  token: string;
  device_type: 'ios' | 'android' | 'web';
  created_at: string;
}

class DjangoAPIClient {
  private baseURL: string;
  private apiKey?: string;

  constructor() {
    this.baseURL = process.env.DJANGO_API_URL || 'http://localhost:8000';
    this.apiKey = process.env.DJANGO_API_KEY;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Django API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Verify JWT token with Django backend
   */
  async verifyToken(token: string): Promise<DjangoUser> {
    return this.makeRequest<DjangoUser>('/api/auth/verify-token/', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /**
   * Get user by ID
   */
  async getUser(userId: number): Promise<DjangoUser> {
    return this.makeRequest<DjangoUser>(`/api/users/${userId}/`);
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: number): Promise<DjangoConversation> {
    return this.makeRequest<DjangoConversation>(`/api/conversations/${conversationId}/`);
  }

  /**
   * Save message to Django database
   */
  async saveMessage(messageData: {
    conversation_id: number;
    sender_id: number;
    content: string;
  }): Promise<DjangoMessage> {
    return this.makeRequest<DjangoMessage>('/api/messages/', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  /**
   * Get user notification preferences
   */
  async getNotificationPreferences(userId: number): Promise<DjangoNotificationPreferences> {
    return this.makeRequest<DjangoNotificationPreferences>(`/api/users/${userId}/notification-preferences/`);
  }

  /**
   * Get user push tokens
   */
  async getPushTokens(userId: number): Promise<DjangoPushToken[]> {
    return this.makeRequest<DjangoPushToken[]>(`/api/users/${userId}/push-tokens/`);
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: number): Promise<void> {
    await this.makeRequest(`/api/messages/${messageId}/mark-read/`, {
      method: 'PATCH',
    });
  }

  /**
   * Get conversation participants
   */
  async getConversationParticipants(conversationId: number): Promise<DjangoUser[]> {
    return this.makeRequest<DjangoUser[]>(`/api/conversations/${conversationId}/participants/`);
  }

  /**
   * Check if user has permission to send message in conversation
   */
  async canSendMessage(userId: number, conversationId: number): Promise<boolean> {
    try {
      const conversation = await this.getConversation(conversationId);
      return conversation.buyer_id === userId || conversation.seller_id === userId;
    } catch (error) {
      console.error('Error checking message permission:', error);
      return false;
    }
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId: number): Promise<DjangoConversation[]> {
    return this.makeRequest<DjangoConversation[]>(`/api/users/${userId}/conversations/`);
  }

  /**
   * Create new conversation
   */
  async createConversation(conversationData: {
    property_id: number;
    buyer_id: number;
    seller_id: number;
  }): Promise<DjangoConversation> {
    return this.makeRequest<DjangoConversation>('/api/conversations/', {
      method: 'POST',
      body: JSON.stringify(conversationData),
    });
  }
}

export const djangoClient = new DjangoAPIClient();
export default djangoClient; 