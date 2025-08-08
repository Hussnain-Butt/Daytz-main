// File: src/types/Notification.ts
// ✅ NAYI FILE

export interface Notification {
  notification_id: number;
  user_id: string;
  message: string;
  type: string;
  status: 'read' | 'unread';
  related_entity_id: string | null;
  created_at: string; // This will be an ISO date string from the backend
}
