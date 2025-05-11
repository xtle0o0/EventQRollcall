export interface Workshop {
  id: string;
  name: string;
  description?: string;
  date: string;
  location?: string;
  user_id: number;
  created_at: string;
  updated_at?: string;
  isVip: boolean;
  maxCapacity?: number;
}

export interface Guest {
  id: string;
  name: string;
  email: string;
  qr_code: string;
  user_id?: number;
  created_at: string;
  updated_at?: string;
  isVip: boolean;
}

export interface AttendanceRecord {
  id: string;
  workshopId: string;
  guestId: string;
  timestamp: string;
  workshop_id?: string;
  guest_id?: string;
  created_at?: string;
}

export interface ApplicationState {
  workshops: Workshop[];
  guests: Guest[];
  attendance: AttendanceRecord[];
}
