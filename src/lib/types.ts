
export interface Coordinates {
  lat: number;
  lng: number;
}

export enum TripType {
  LEISURE = 'LEISURE', // Ocio 🏖️
  BUSINESS = 'BUSINESS', // Trabajo 💼
  DIGITAL_NOMAD = 'DIGITAL_NOMAD', // Nómada Digital 💻
  EVENT = 'EVENT', // Evento Especial 🎉
}

export enum TripStyle {
  BACKPACKER = 'BACKPACKER', // Mochilero 🎒
  LUXURY = 'LUXURY', // Lujo 💎
  FAMILY = 'FAMILY', // Familiar 👨‍👩‍👧‍👦
  CLASSIC = 'CLASSIC', // Clásico 🏛️
  ADVENTURE = 'ADVENTURE', // Aventura 🌲
}

export interface Trip {
  id: string; // UUID / String, Identificador único del viaje.
  userId: string; // UUID / String, ID del usuario propietario del viaje.
  name: string; // Nombre descriptivo del viaje. Max 100 chars.
  startDate: string; // Date (ISO 8601), Fecha de inicio del viaje.
  endDate: string; // Date (ISO 8601), Fecha de fin del viaje.
  coverImageUrl?: string; // URL a la imagen de portada.
  tripType: TripType; // Tipo de viaje.
  tripStyle: TripStyle; // Estilo de viaje.
  collaborators?: string[]; // Array[UUID] de userIds.
  familia?: string; // For compatibility with existing DashboardView data structure for TripHeader
  createdAt: string; // Timestamp ISO
  updatedAt: string; // Timestamp ISO
}

export interface City {
  id: string; 
  tripId: string; // Foreign Key to Trip.id
  name: string;
  country: string;
  arrivalDate: string; // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
  coordinates: Coordinates;
  notes?: string;
  budget?: number; 
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
  tripId: string; // Foreign Key to Trip.id
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  title: string;
  category: ActivityCategory;
  notes?: string;
  cost?: number;
  city: string; // Name of the city (should ideally be cityId in future)
  order: number; 
  attachments?: ActivityAttachment[];
  createdAt?: any; // Firestore Timestamp or ISO string
  updatedAt?: any; // Firestore Timestamp or ISO string
}

export interface Expense {
  id: string;
  tripId: string; // Foreign Key to Trip.id
  city: string; // Name of the city (should ideally be cityId in future)
  date: string; // YYYY-MM-DD
  category: string;
  description: string;
  amount: number;
}

// This TripDetails is becoming more of a "FullTripData" loaded for a specific trip.
// The list on "Mis Viajes" will use the `Trip` interface primarily.
export interface TripDetails extends Trip { // Extends Trip to include its base fields
  // `id`, `name`, `startDate`, `endDate`, `coverImageUrl`, `tripType`, `tripStyle` come from Trip
  // `familia` is kept for now for `TripHeader` but should ideally be derived or part of Trip context
  ciudades: City[];
  paises: string[]; // Could be derived from cities
  activities: Activity[];
  expenses: Expense[]; // Derived from activities with cost
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
  cityInfo: string; 
  activities: Activity[];
  isWorkDay?: boolean;
  isTravelDay?: boolean;
};

export type BudgetPerCity = {
  city: string;
  totalCost: number;
};

export interface ItineraryWeek {
  weekStartDate: string; 
  weekEndDate: string; 
  weekLabel: string; 
  weekLabelShort: string; 
  days: ItineraryDay[];
  totalWeeklyCost: number;
  isDefaultExpanded: boolean;
}

// For CreateTripWizard
export interface CreateTripStepProps {
  formData: Partial<Trip>;
  updateFormData: (data: Partial<Trip>) => void;
  onNext: () => void;
  onBack?: () => void;
}

export const GOOGLE_MAPS_LIBRARIES = ['routes', 'marker', 'places'] as Array<'routes' | 'marker' | 'places'>;
export const GOOGLE_MAPS_SCRIPT_ID = 'app-google-maps-script';
