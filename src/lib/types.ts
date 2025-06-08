

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface City {
  name: string;
  country: string;
  arrivalDate: string; // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
  coordinates: Coordinates;
  notes?: string;
}

export type ActivityCategory = 'Viaje' | 'Comida' | 'Cultural' | 'Ocio' | 'Trabajo' | 'Alojamiento' | 'Otro';

export const activityCategories: ActivityCategory[] = ['Viaje', 'Comida', 'Cultural', 'Ocio', 'Trabajo', 'Alojamiento', 'Otro'];


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
  expenses: Expense[];
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
