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
  ownPhone?: string;
  areaId?: string;
  assignedAssistantId?: string;
  serviceStartDate?: string;
  teamId?: string;
  parentOfDeaconId?: string;
  lastHomeVisitDate?: string;
  createdAt: string;
  isFirstLogin?: boolean;
}
