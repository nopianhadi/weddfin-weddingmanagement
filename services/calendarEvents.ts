import supabase from '../lib/supabaseClient';
import { AssignedTeamMember, PaymentStatus, Project } from '../types';

const TABLE = 'calendar_events';

export type CalendarEventRow = {
  id: string;
  title: string;
  event_type: string;
  date: string; // ISO date
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  team?: AssignedTeamMember[] | null; // jsonb
  image?: string | null;
  location?: string | null;
  created_at?: string;
};

function toProjectLike(row: CalendarEventRow): Project {
  return {
    id: row.id,
    projectName: row.title,
    clientName: 'Acara Internal',
    clientId: 'INTERNAL',
    projectType: row.event_type,
    packageName: '',
    packageId: '',
    addOns: [],
    date: row.date,
    deadlineDate: undefined,
    location: row.location || '',
    progress: 100,
    status: 'Dikonfirmasi',
    totalCost: 0,
    amountPaid: 0,
    paymentStatus: PaymentStatus.LUNAS,
    team: (row.team as any) || [],
    notes: row.notes || undefined,
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    image: row.image || undefined,
  } as Project;
}

export async function listCalendarEvents(): Promise<Project[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('date', { ascending: true });
  if (error) throw error;
  return ((data || []) as any[]).map(toProjectLike);
}

export async function listCalendarEventsInRange(fromDate: string, toDate: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true });
  if (error) throw error;
  return ((data || []) as any[]).map(toProjectLike);
}

export type CreateCalendarEventInput = {
  title: string;
  eventType: string;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  team?: AssignedTeamMember[];
  image?: string;
  location?: string;
};

export async function createCalendarEvent(input: CreateCalendarEventInput): Promise<Project> {
  const payload = {
    title: input.title,
    event_type: input.eventType,
    date: input.date,
    start_time: input.startTime ?? null,
    end_time: input.endTime ?? null,
    notes: input.notes ?? null,
    team: input.team ?? [],
    image: input.image ?? null,
    location: input.location ?? null,
  } as Partial<CalendarEventRow>;

  const { data, error } = await supabase
    .from(TABLE)
    .insert([payload])
    .select('*')
    .single();
  if (error) throw error;
  return toProjectLike(data);
}

export type UpdateCalendarEventInput = Partial<CreateCalendarEventInput>;

export async function updateCalendarEvent(id: string, input: UpdateCalendarEventInput): Promise<Project> {
  const payload: Partial<CalendarEventRow> = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.eventType !== undefined ? { event_type: input.eventType } : {}),
    ...(input.date !== undefined ? { date: input.date } : {}),
    ...(input.startTime !== undefined ? { start_time: input.startTime } : {}),
    ...(input.endTime !== undefined ? { end_time: input.endTime } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.team !== undefined ? { team: input.team } : {}),
    ...(input.image !== undefined ? { image: input.image } : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return toProjectLike(data);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', id);
  if (error) throw error;
}
