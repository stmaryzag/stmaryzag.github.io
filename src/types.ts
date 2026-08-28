export type Role = 'deacon' | 'parent' | 'admin' | 'assistant';

export interface UserData {
  id: string;
  username: string;
  role: Role;
  fullName: string;
  photoUrl?: string;
  birthDate?: string;
  grade?: string;
  parentPhone?: string;
  dadPhone?: string;
  momPhone?: string;
  ownPhone?: string;
  address?: string;
  areaId?: string;
  assignedAssistantId?: string;
  serviceStartDate?: string;
  teamId?: string;
  parentOfDeaconId?: string;
  lastHomeVisitDate?: string;
  createdAt: string;
  isFirstLogin?: boolean;
  tempPassword?: string;
}

export interface SubscriptionRecord {
  id?: string;
  deaconId: string;
  deaconName?: string;
  monthKey: string; // e.g. "2026-08"
  year: number;
  month: number;
  amount: number; // 30 EGP
  paid: boolean;
  paidAt?: string;
  recordedBy?: string;
  recordedByName?: string;
  notes?: string;
}

export interface ActivityType {
  id: string;
  name: string;
  defaultPoints: number;
  requiresApproval: boolean;
  active: boolean;
  icon?: string;
  category?: 'liturgy' | 'confession' | 'hymns' | 'service' | 'other';
}

export interface UserLevel {
  id?: string;
  levelNumber: number;
  title: string;
  minPoints: number;
  badgeColor?: string;
  icon?: string;
  description?: string;
}

export interface RecurringNotification {
  id?: string;
  title: string;
  body: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  time: string; // "HH:MM" 24h
  audience: 'all' | 'deacons' | 'parents';
  colorTag: 'blue' | 'green' | 'red' | 'yellow';
  active: boolean;
  lastDispatchedWeekKey?: string;
  createdAt: string;
  createdBy?: string;
}

export interface PointLog {
  id?: string;
  deaconId: string;
  reason: string;
  points: number;
  date: string;
  addedBy: string;
  monthKey: string;
  activityTypeId?: string;
}
