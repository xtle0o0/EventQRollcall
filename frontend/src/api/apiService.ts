import { Workshop, Guest, AttendanceRecord } from '../types';

// Safely access environment variables or use a default URL
// For development, just hardcode to localhost
const API_BASE_URL = 'http://161.35.163.90:3000/api';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper to create authorized headers
const createAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Workshop API calls
export const fetchWorkshops = async (): Promise<Workshop[]> => {
  const response = await fetch(`${API_BASE_URL}/workshops`, {
    headers: createAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch workshops');
  return response.json();
};

export const createWorkshop = async (workshop: Omit<Workshop, 'id' | 'user_id' | 'created_at'>): Promise<Workshop> => {
  const response = await fetch(`${API_BASE_URL}/workshops`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify(workshop),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create workshop');
  }

  return response.json();
};

export const updateWorkshop = async (workshop: Workshop): Promise<Workshop> => {
  const response = await fetch(`${API_BASE_URL}/workshops/${workshop.id}`, {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify(workshop),
  });
  if (!response.ok) throw new Error('Failed to update workshop');
  return response.json();
};

export const deleteWorkshop = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/workshops/${id}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete workshop');
};

export const getWorkshopById = async (id: string): Promise<Workshop> => {
  const response = await fetch(`${API_BASE_URL}/workshops/${id}`, {
    headers: createAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch workshop');
  return response.json();
};

// Guest API calls
export const fetchGuests = async (): Promise<Guest[]> => {
  const response = await fetch(`${API_BASE_URL}/guests`, {
    headers: createAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch guests');
  
  const guests = await response.json();
  
  // Map snake_case to camelCase and ensure boolean types
  return guests.map((guest: any) => ({
    ...guest,
    isVip: guest.isVip || guest.is_vip === 1 || guest.is_vip === true,
    qr_code: guest.qr_code || guest.qrCode
  }));
};

export const createGuest = async (guest: Omit<Guest, 'id' | 'qr_code'>): Promise<Guest> => {
  const response = await fetch(`${API_BASE_URL}/guests`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify(guest),
  });
  if (!response.ok) throw new Error('Failed to create guest');
  return response.json();
};

export const updateGuest = async (guest: Guest): Promise<Guest> => {
  const response = await fetch(`${API_BASE_URL}/guests/${guest.id}`, {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      name: guest.name,
      email: guest.email,
      isVip: guest.isVip
    }),
  });
  if (!response.ok) throw new Error('Failed to update guest');
  return response.json();
};

export const deleteGuest = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/guests/${id}`, {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to delete guest');
};

export const getGuestByQRCode = async (qrCode: string): Promise<Guest> => {
  const response = await fetch(`${API_BASE_URL}/guests/qr/${qrCode}`, {
    headers: createAuthHeaders()
  });
  if (!response.ok) throw new Error('Guest not found');
  
  const guest = await response.json();
  
  // Map snake_case to camelCase and ensure boolean types
  return {
    ...guest,
    isVip: guest.isVip || guest.is_vip === 1 || guest.is_vip === true,
    qr_code: guest.qr_code || guest.qrCode
  };
};

// Attendance API calls
export const fetchAttendance = async (): Promise<AttendanceRecord[]> => {
  const response = await fetch(`${API_BASE_URL}/attendance`, {
    headers: createAuthHeaders()
  });
  
  if (!response.ok) throw new Error('Failed to fetch attendance records');
  
  // Get the raw data from the API
  const rawData = await response.json();
  
  // Log the raw data to debug the response format
  console.log("Raw attendance data:", rawData);
  
  // Normalize the data to ensure it matches our AttendanceRecord type
  return rawData.map((record: any) => {
    // Handle different field name formats (snake_case vs camelCase)
    return {
      id: record.id,
      guestId: record.guestId || record.guest_id,
      workshopId: record.workshopId || record.workshop_id,
      timestamp: record.timestamp || record.created_at
    };
  });
};

export const recordAttendance = async (guestId: string, workshopId: string): Promise<AttendanceRecord> => {
  const response = await fetch(`${API_BASE_URL}/attendance`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      guestId,
      workshopId,
      timestamp: new Date().toISOString(),
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.error === "Non-VIP guest cannot attend VIP workshops") {
      throw new Error("Non-VIP guest cannot attend VIP workshops");
    }
    throw new Error('Failed to record attendance');
  }
  
  // Get the raw data from the API
  const rawData = await response.json();
  
  // Log the raw data to debug the response format
  console.log("Raw recorded attendance data:", rawData);
  
  // Normalize the data to ensure it matches our AttendanceRecord type
  return {
    id: rawData.id,
    guestId: rawData.guestId || rawData.guest_id,
    workshopId: rawData.workshopId || rawData.workshop_id,
    timestamp: rawData.timestamp || rawData.created_at
  };
};

export const getGuestAttendance = async (guestId: string): Promise<Workshop[]> => {
  const response = await fetch(`${API_BASE_URL}/attendance/guest/${guestId}`, {
    headers: createAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch guest attendance');
  return response.json();
};

export const getWorkshopAttendees = async (workshopId: string): Promise<Guest[]> => {
  const response = await fetch(`${API_BASE_URL}/attendance/workshop/${workshopId}`, {
    headers: createAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to fetch workshop attendees');
  return response.json();
};

export const calculateAttendancePercentage = async (guestId: string): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/analytics/guest/${guestId}/percentage`, {
    headers: createAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to calculate attendance percentage');
  return response.json().then(data => data.percentage);
};

export const isEligibleForAttestation = async (guestId: string): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/analytics/guest/${guestId}/eligible`, {
    headers: createAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to check attestation eligibility');
  return response.json().then(data => data.eligible);
};

export const getWorkshopAttendancePercentage = async (workshopId: string): Promise<number> => {
  const response = await fetch(`${API_BASE_URL}/analytics/workshop/${workshopId}/percentage`, {
    headers: createAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to get workshop attendance percentage');
  return response.json().then(data => data.percentage);
};

export const getLastCheckIns = async (count: number = 5): Promise<AttendanceRecord[]> => {
  const response = await fetch(`${API_BASE_URL}/attendance/recent?count=${count}`, {
    headers: createAuthHeaders()
  });
  
  if (!response.ok) throw new Error('Failed to fetch recent check-ins');
  
  // Get the raw data from the API
  const rawData = await response.json();
  
  // Log the raw data to debug the response format
  console.log("Raw recent check-ins data:", rawData);
  
  // Normalize the data to ensure it matches our AttendanceRecord type
  return rawData.map((record: any) => {
    // Handle different field name formats (snake_case vs camelCase)
    return {
      id: record.id,
      guestId: record.guestId || record.guest_id,
      workshopId: record.workshopId || record.workshop_id,
      timestamp: record.timestamp || record.created_at
    };
  });
};

// Authentication API calls
export const login = async (username: string, password: string): Promise<{ token: string, user: any }> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Login failed');
  }
  
  const data = await response.json();
  
  // Save the token to localStorage for future requests
  localStorage.setItem('authToken', data.token);
  
  return data;
};

export const register = async (username: string, password: string): Promise<{ userId: string }> => {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Registration failed');
  }
  
  return response.json();
};

export const logout = (): void => {
  // Remove token from localStorage
  localStorage.removeItem('authToken');
};

export const getProfile = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/profile`, {
    headers: createAuthHeaders()
  });
  
  if (!response.ok) throw new Error('Failed to fetch user profile');
  return response.json();
};

export const generateCertificate = async (guestId: string, guestName: string): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/certificates/generate`, {
    method: 'POST',
    headers: {
      ...createAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guestId, guestName }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate certificate');
  }

  return response.blob();
};

// VIP Access Management
export const addVipAccess = async (guestId: string, workshopId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/workshops/${workshopId}/vip-access`, {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({ guestId })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to add VIP access: ${response.status}`);
  }
};

export const removeVipAccess = async (guestId: string, workshopId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/workshops/${workshopId}/vip-access/${guestId}`, {
    method: 'DELETE',
    headers: createAuthHeaders()
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to remove VIP access: ${response.status}`);
  }
};

export const getVipAccessList = async (guestId: string): Promise<Workshop[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/guests/${guestId}/vip-access`, {
      headers: createAuthHeaders()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Failed to fetch VIP access list: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching VIP access list:', error);
    return []; // Return empty array instead of failing completely
  }
}; 