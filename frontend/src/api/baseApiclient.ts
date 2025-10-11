import axios from 'axios';
import type { AxiosInstance } from 'axios';

const API_BASE_URL = 'http://localhost:8088';

// Create base axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies
});

// Function to create domain-specific API clients
export const createApiClient = (baseRoute: string): AxiosInstance => {
  return axios.create({
    baseURL: `${API_BASE_URL}${baseRoute}`,
    withCredentials: true,
  });
};

// Common types
export interface User {
  id: string;
  email: string;
  name: string;
}
