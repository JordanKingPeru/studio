
import type { Trip, TripDetails, Activity, Expense, City } from './types';
import { TripType, TripStyle } from './types';

// This 'sampleTripData' can be used as a fallback or for a single trip view if needed.
// For "Mis Viajes", a list of Trip objects will be fetched/mocked.

const sampleTripId = "sample-trip-123";

const initialActivities: Activity[] = [
  { tripId: sampleTripId, id: 'act1', date: '2025-09-12', time: '10:00', title: 'Llegada a Madrid y Check-in Hotel', category: 'Alojamiento', notes: 'Recoger maletas, taxi al hotel NH Collection Madrid Eurobuilding.', cost: 50, city: 'Madrid', order: 0, attachments: [] },
  { tripId: sampleTripId, id: 'act2', date: '2025-09-12', time: '14:00', title: 'Almuerzo en Lateral Castellana', category: 'Comida', notes: 'Tapas y comida española.', cost: 75, city: 'Madrid', order: 1, attachments: [] },
  { tripId: sampleTripId, id: 'act3', date: '2025-09-12', time: '16:00', title: 'Paseo por el Parque del Retiro', category: 'Ocio', notes: 'Alquilar barca en el estanque.', cost: 10, city: 'Madrid', order: 2, attachments: [] },
  { tripId: sampleTripId, id: 'act4', date: '2025-09-13', time: '09:30', title: 'Visita Museo del Prado', category: 'Cultural', notes: 'Comprar entradas con antelación. Ver Las Meninas.', cost: 30, city: 'Madrid', order: 0, attachments: [] },
  { tripId: sampleTripId, id: 'act5', date: '2025-09-13', time: '13:00', title: 'Comida en Mercado de San Miguel', category: 'Comida', notes: 'Probar distintas tapas y vinos.', cost: 60, city: 'Madrid', order: 1, attachments: [] },
  { tripId: sampleTripId, id: 'act6', date: '2025-09-15', time: '09:00', title: 'Inicio jornada laboral (Remoto)', category: 'Trabajo', notes: 'Reuniones y tareas asignadas.', city: 'Madrid', order: 0, attachments: [] },
];

const initialCities: City[] = [
    { tripId: sampleTripId, id: 'static-madrid', name: "Madrid", country: "España", arrivalDate: "2025-09-12", departureDate: "2025-09-16", coordinates: { lat: 40.416775, lng: -3.703790 }, budget: 1500 },
    { tripId: sampleTripId, id: 'static-barcelona', name: "Barcelona", country: "España", arrivalDate: "2025-09-16", departureDate: "2025-09-20", coordinates: { lat: 41.3851, lng: 2.1734 }, budget: 1200 },
    { tripId: sampleTripId, id: 'static-valencia', name: "Valencia", country: "España", arrivalDate: "2025-09-20", departureDate: "2025-09-23", coordinates: { lat: 39.4699, lng: -0.3763 }, budget: 800 },
    { tripId: sampleTripId, id: 'static-granada', name: "Granada", country: "España", arrivalDate: "2025-09-23", departureDate: "2025-09-26", coordinates: { lat: 37.1773, lng: -3.5986 }, budget: 700 },
    { tripId: sampleTripId, id: 'static-sevilla', name: "Sevilla", country: "España", arrivalDate: "2025-09-26", departureDate: "2025-09-29", coordinates: { lat: 37.3891, lng: -5.9845 }, budget: 900 },
    { tripId: sampleTripId, id: 'static-lisboa', name: "Lisboa", country: "Portugal", arrivalDate: "2025-09-29", departureDate: "2025-10-03", coordinates: { lat: 38.7223, lng: -9.1393 }, budget: 1000 },
    { tripId: sampleTripId, id: 'static-roma', name: "Roma", country: "Italia", arrivalDate: "2025-10-03", departureDate: "2025-10-07", coordinates: { lat: 41.9028, lng: 12.4964 }, budget: 1300 },
    { tripId: sampleTripId, id: 'static-paris', name: "París", country: "Francia", arrivalDate: "2025-10-07", departureDate: "2025-10-11", coordinates: { lat: 48.8566, lng: 2.3522 }, budget: 1600 },
    { tripId: sampleTripId, id: 'static-cairo', name: "El Cairo", country: "Egipto", arrivalDate: "2025-10-11", departureDate: "2025-10-15", coordinates: { lat: 30.0444, lng: 31.2357 }, notes: "Visita a Egipto, detalles por confirmar.", budget: 1000 },
];

const initialExpenses: Expense[] = initialActivities
  .filter(activity => typeof activity.cost === 'number' && activity.cost > 0)
  .map(activity => ({
    tripId: sampleTripId,
    id: `${activity.id}-expense`, 
    city: activity.city,
    date: activity.date,
    category: activity.category, 
    description: activity.title, 
    amount: Number(activity.cost || 0),
  }));


export const sampleTripDetails: TripDetails = {
  id: sampleTripId,
  userId: "user-123", // Example userId
  name: "Viaje Familiar Demo por Europa y Egipto",
  startDate: "2025-09-12",
  endDate: "2025-10-26",
  coverImageUrl: "https://placehold.co/600x400.png",
  tripType: TripType.FAMILY, // Assuming Family is a style, Leisure is a type
  tripStyle: TripStyle.FAMILY,
  familia: "2 adultos y 1 niña de 6 años", // Kept for TripHeader compatibility
  trabajo_ini: "2025-09-15", // Example, link to TripType.BUSINESS if applicable
  trabajo_fin: "2025-10-04",
  ciudades: initialCities,
  paises: ["España", "Portugal", "Italia", "Francia", "Egipto"],
  activities: initialActivities,
  expenses: initialExpenses,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const GOOGLE_MAPS_LIBRARIES = ['routes', 'marker', 'places'] as Array<'routes' | 'marker' | 'places'>;
export const GOOGLE_MAPS_SCRIPT_ID = 'app-google-maps-script';
