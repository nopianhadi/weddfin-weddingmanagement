import supabase from '../lib/supabaseClient';
import { Notification, ViewType } from '../types';

const TABLE = 'notifications';

function normalize(row: any): Notification {
  return {
    id: row.id,
    title: row.title ?? '',
    message: row.message ?? '',
    timestamp: row.timestamp,
    isRead: Boolean(row.is_read),
    icon: row.icon as Notification['icon'],
    link: row.link ? ({
      view: (row.link.view as ViewType),
      action: row.link.action ?? undefined,
    }) : undefined,
  };
}

function denormalize(obj: Partial<Notification>): any {
  return {
    ...(obj.title !== undefined ? { title: obj.title } : {}),
    ...(obj.message !== undefined ? { message: obj.message } : {}),
    ...(obj.timestamp !== undefined ? { timestamp: obj.timestamp } : {}),
    ...(obj.isRead !== undefined ? { is_read: obj.isRead } : {}),
    ...(obj.icon !== undefined ? { icon: obj.icon } : {}),
    ...(obj.link !== undefined ? { link: obj.link } : {}),
  };
}

export async function listNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return (data || []).map(normalize);
}

export async function createNotification(payload: Omit<Notification, 'id'>): Promise<Notification> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ ...denormalize(payload) }])
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function updateNotification(id: string, patch: Partial<Notification>): Promise<Notification> {
  const { data, error } = await supabase
    .from(TABLE)
    .update(denormalize(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
}
