import { Workshop, Guest, AttendanceRecord } from '../types';
import * as apiService from '../api/apiService';

// Workshop operations
export const getWorkshops = async (): Promise<Workshop[]> => {
  return apiService.fetchWorkshops();
};

export const saveWorkshop = async (workshop: Omit<Workshop, 'id'>): Promise<Workshop> => {
  return apiService.createWorkshop(workshop);
};

export const updateWorkshop = async (workshop: Workshop): Promise<Workshop> => {
  return apiService.updateWorkshop(workshop);
};

export const removeWorkshop = async (id: string): Promise<void> => {
  return apiService.deleteWorkshop(id);
};

export const getWorkshopById = async (id: string): Promise<Workshop> => {
  return apiService.getWorkshopById(id);
};

// Guest operations
export const getGuests = async (): Promise<Guest[]> => {
  return apiService.fetchGuests();
};

export const saveGuest = async (guest: Omit<Guest, 'id' | 'qrCode'>): Promise<Guest> => {
  return apiService.createGuest(guest);
};

export const updateGuest = async (guest: Guest): Promise<Guest> => {
  return apiService.updateGuest(guest);
};

export const removeGuest = async (id: string): Promise<void> => {
  return apiService.deleteGuest(id);
};

export const getGuestByQRCode = async (qrCode: string): Promise<Guest | undefined> => {
  try {
    return await apiService.getGuestByQRCode(qrCode);
  } catch (error) {
    console.error('Error fetching guest by QR code:', error);
    return undefined;
  }
};

// Attendance operations
export const getAttendance = async (): Promise<AttendanceRecord[]> => {
  return apiService.fetchAttendance();
};

export const recordAttendance = async (guestId: string, workshopId: string): Promise<AttendanceRecord> => {
  return apiService.recordAttendance(guestId, workshopId);
};

// Analytics
export const getGuestAttendance = async (guestId: string): Promise<Workshop[]> => {
  return apiService.getGuestAttendance(guestId);
};

export const getWorkshopAttendees = async (workshopId: string): Promise<Guest[]> => {
  return apiService.getWorkshopAttendees(workshopId);
};

export const calculateAttendancePercentage = async (guestId: string): Promise<number> => {
  return apiService.calculateAttendancePercentage(guestId);
};

export const isEligibleForAttestation = async (guestId: string): Promise<boolean> => {
  return apiService.isEligibleForAttestation(guestId);
};

export const getWorkshopAttendancePercentage = async (workshopId: string): Promise<number> => {
  return apiService.getWorkshopAttendancePercentage(workshopId);
};

export const getLastCheckIns = async (count: number = 5): Promise<AttendanceRecord[]> => {
  return apiService.getLastCheckIns(count);
};

// Utility functions
export const generateQRCode = (guestId: string): string => {
  return `guest-${guestId}`;
}; 