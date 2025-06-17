
import type { User as FirebaseUser } from 'firebase/auth';

export interface Coordinates {
  lat: number;
  lng: number;
}

export enum TripType {
  LEISURE = 'LEISURE', 
  BUSINESS = 'BUSINESS', 
  DIGITAL_NOMAD = 'DIGITAL_NOMAD', 
  EVENT = 'EVENT', 
}

export enum TripStyle {
  BACKPACKER = 'BACKPACKER', 
  LUXURY = 'LUXURY', 
  FAMILY = 'FAMILY', 
  CLASSIC = 'CLASSIC', 
  ADVENTURE = 'ADVENTURE', 
}

export const tripTypeTranslations: Record<TripType, { label: string; example: string }> = {
  [TripType.LEISURE]: { label: "Ocio", example: "Vacaciones relajantes, turismo general, desconexión." },
  [TripType.BUSINESS]: { label: "Negocios", example: "Viajes de trabajo, conferencias, reuniones profesionales." },
  [TripType.DIGITAL_NOMAD]: { label: "Nómada Digital", example: "Trabajar remotamente mientras se viaja y explora nuevos lugares." },
  [TripType.EVENT]: { label: "Evento Especial", example: "Asistir a bodas, conciertos, festivales, competiciones deportivas." },
};

export const tripStyleTranslations: Record<TripStyle, { label: string; example: string }> = {
  [TripStyle.BACKPACKER]: { label: "Mochilero", example: "Presupuesto ajustado, aventura, hostales, exploración independiente y flexible." },
  [TripStyle.LUXURY]: { label: "Lujo", example: "Hoteles de alta gama, experiencias exclusivas, máximo confort y servicio premium." },
  [TripStyle.FAMILY]: { label: "Familiar", example: "Actividades para todas las edades, comodidad para niños, destinos y alojamientos amigables para familias." },
  [TripStyle.CLASSIC]: { label: "Clásico", example: "Turismo tradicional, visitas a monumentos históricos, rutas culturales, guías turísticas." },
  [TripStyle.ADVENTURE]: { label: "Aventura", example: "Deportes extremos, senderismo, naturaleza salvaje, exploración activa y desafíos." },
};


export interface Trip {
  id: string; 
  userId: string; 
  name: string; 
  startDate: string; 
  endDate: string; 
  coverImageUrl?: string; 
  tripType: TripType; 
  tripStyle: TripStyle; 
  collaborators?: string[]; 
  familia?: string; 
  createdAt: string; 
  updatedAt: string; 
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  emailVerified: boolean;
  createdAt?: string; // ISO string, from Firestore serverTimestamp
  subscription: {
    status: 'free' | 'pro' | 'cancelled';
    plan: 'free_tier' | 'pro_tier';
    tripsCreated: number;
    maxTrips: number;
    renewalDate?: string; // ISO string for pro tier
  };
}

export interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  isFetchingProfile: boolean;
  // Explicitly list auth functions if they are directly exposed by context,
  // otherwise they might be used internally or through a separate service.
}


export interface City {
  id: string; 
  tripId: string; 
  name: string;
  country: string;
  arrivalDate: string; 
  departureDate: string; 
  coordinates: Coordinates;
  notes?: string;
  budget?: number; 
}

export type ActivityCategory = 'Viaje' | 'Comida' | 'Cultural' | 'Ocio' | 'Trabajo' | 'Alojamiento' | 'Otro';

export const activityCategories: ActivityCategory[] = ['Viaje', 'Comida', 'Cultural', 'Ocio', 'Trabajo', 'Alojamiento', 'Otro'];

export interface ActivityAttachment {
  fileName: string;
  downloadURL: string;
  uploadedAt: string; 
  fileType: string; 
}

export interface Activity {
  id: string;
  tripId: string; 
  date: string; 
  time: string; 
  title: string;
  category: ActivityCategory;
  notes?: string;
  cost?: number;
  city: string; 
  order: number; 
  attachments?: ActivityAttachment[];
  createdAt?: any; 
  updatedAt?: any; 
}

export enum ExpenseCategory {
  COMIDA = "Comida",
  TRANSPORTE = "Transporte",
  ALOJAMIENTO = "Alojamiento",
  OCIO = "Ocio",
  COMPRAS = "Compras",
  OTROS = "Otros",
}
export const expenseCategories: ExpenseCategory[] = Object.values(ExpenseCategory);


export interface Expense {
  id: string;
  tripId: string; 
  city: string; 
  date: string; 
  category: ExpenseCategory | ActivityCategory; 
  description: string;
  amount: number;
  createdAt?: any; 
  updatedAt?: any; 
}

export interface TripDetails extends Trip { 
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

export interface CreateTripStepProps {
  formData: Partial<Trip>;
  updateFormData: (data: Partial<Trip>) => void;
  onNext: () => void;
  onBack?: () => void;
}

export const GOOGLE_MAPS_LIBRARIES = ['routes', 'marker', 'places'] as Array<'routes' | 'marker' | 'places'>;
export const GOOGLE_MAPS_SCRIPT_ID = 'app-google-maps-script';

export type ExpenseFormData = {
    description: string;
    amount: number;
    category: ExpenseCategory;
    date: string;
    city: string;
    tripId: string;
    id?: string;
};

