/**
 * API utilities for communicating with the backend
 */

// API base URL
export const API_URL = 'http://161.35.163.90:3000';

// API endpoints
export const ENDPOINTS = {
  LOGIN: '/api/login',
  PROFILE: '/api/profile',
};

/**
 * Get the auth token from localStorage
 */
export const getAuthToken = (): string | null => {
  const token = localStorage.getItem('authToken');
  return token;
};

/**
 * Set the auth token in localStorage
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

/**
 * Remove the auth token from localStorage
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem('authToken');
};

/**
 * Make an authenticated API request
 */
export const fetchWithAuth = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };
  
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
};

/**
 * Login user with credentials
 */
export const loginUser = async (username: string, password: string) => {
  const response = await fetch(`${API_URL}${ENDPOINTS.LOGIN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });
  
  if (!response.ok) {
    throw new Error('Login failed');
  }
  
  return response.json();
};

/**
 * Fetch user profile
 */
export const fetchUserProfile = async () => {
  const response = await fetchWithAuth(`${ENDPOINTS.PROFILE}`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  
  return response.json();
}; 