
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface City {
  id: string; // Added for Firestore document ID
  name: string;
  country: string;
  arrivalDate: string; // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
  coordinates: Coordinates;
  notes?: string;
  budget?: number; // Added for BudgetSnapshot widget
}

export type ActivityCategory = 'Viaje' | 'Comida' | 'Cultural' | 'Ocio' | 'Trabajo' | 'Alojamiento' | 'Otro';

export const activityCategories: ActivityCategory[] = ['Viaje', 'Comida', 'Cultural', 'Ocio', 'Trabajo', 'Alojamiento', 'Otro'];

export interface ActivityAttachment {
  fileName: string;
  downloadURL: string;
  uploadedAt: string; // ISO string
  fileType: string; // e.g., 'application/pdf', 'image/jpeg'
}

export interface Activity {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  category: ActivityCategory;
  notes?: string;
  cost?: number;
  city: string; // Name of the city
  order: number; // For drag-and-drop reordering
  attachments?: ActivityAttachment[];
  createdAt?: any; // Firestore Timestamp
  updatedAt?: any; // Firestore Timestamp
}

export interface Expense {
  id: string;
  city: string; // Name of the city
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  amount: number;
}

export interface TripDetails {
  inicio: string; // YYYY-MM-DD
  fin: string; // YYYY-MM-DD
  trabajo_ini?: string; // YYYY-MM-DD
  trabajo_fin?: string; // YYYY-MM-DD
  familia: string;
  ciudades: City[];
  paises: string[];
  activities: Activity[];
  expenses: Expense[]; // This will be derived from activities with costs
}

export interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  iconUrl?: string;
  alert?: string;
}

export type ItineraryDay = {
  date: string;
  cityInfo: string; // e.g., "Madrid, España" or "Travel: Madrid to Barcelona"
  activities: Activity[];
  isWorkDay?: boolean;
  isTravelDay?: boolean;
};

export type BudgetPerCity = {
  city: string;
  totalCost: number;
};

export interface ItineraryWeek {
  weekStartDate: string; // YYYY-MM-DD, Monday
  weekEndDate: string; // YYYY-MM-DD, Sunday
  weekLabel: string; // Full label for larger screens
  weekLabelShort: string; // Short label for smaller screens
  days: ItineraryDay[];
  totalWeeklyCost: number;
  isDefaultExpanded: boolean;
}
