
import type { TripDetails, Activity, Expense } from './types';

const initialActivities: Activity[] = [
  { id: 'act1', date: '2025-09-12', time: '10:00', title: 'Llegada a Madrid y Check-in Hotel', category: 'Alojamiento', notes: 'Recoger maletas, taxi al hotel NH Collection Madrid Eurobuilding.', cost: 50, city: 'Madrid', order: 0, attachments: [] },
  { id: 'act2', date: '2025-09-12', time: '14:00', title: 'Almuerzo en Lateral Castellana', category: 'Comida', notes: 'Tapas y comida española.', cost: 75, city: 'Madrid', order: 1, attachments: [] },
  { id: 'act3', date: '2025-09-12', time: '16:00', title: 'Paseo por el Parque del Retiro', category: 'Ocio', notes: 'Alquilar barca en el estanque.', cost: 10, city: 'Madrid', order: 2, attachments: [] },
  { id: 'act4', date: '2025-09-13', time: '09:30', title: 'Visita Museo del Prado', category: 'Cultural', notes: 'Comprar entradas con antelación. Ver Las Meninas.', cost: 30, city: 'Madrid', order: 0, attachments: [] },
  { id: 'act5', date: '2025-09-13', time: '13:00', title: 'Comida en Mercado de San Miguel', category: 'Comida', notes: 'Probar distintas tapas y vinos.', cost: 60, city: 'Madrid', order: 1, attachments: [] },
  { id: 'act6', date: '2025-09-15', time: '09:00', title: 'Inicio jornada laboral (Remoto)', category: 'Trabajo', notes: 'Reuniones y tareas asignadas.', city: 'Madrid', order: 0, attachments: [] },
];

const initialExpenses: Expense[] = [
  { id: 'exp1', city: 'Madrid', category: 'Alojamiento', description: 'Hotel NH Collection (Noche 1)', amount: 180, date: '2025-09-12' },
  { id: 'exp2', city: 'Madrid', category: 'Transporte', description: 'Taxi Aeropuerto - Hotel', amount: 50, date: '2025-09-12' },
  { id: 'exp3', city: 'Madrid', category: 'Comida', description: 'Almuerzo Lateral Castellana', amount: 75, date: '2025-09-12' },
  { id: 'exp4', city: 'Madrid', category: 'Ocio', description: 'Barca Parque del Retiro', amount: 10, date: '2025-09-12' },
  { id: 'exp5', city: 'Madrid', category: 'Cultural', description: 'Entradas Museo del Prado (2 adultos)', amount: 30, date: '2025-09-13' },
];

export const viaje: TripDetails = {
  inicio: "2025-09-12",
  fin: "2025-10-26",
  trabajo_ini: "2025-09-15",
  trabajo_fin: "2025-10-04",
  familia: "2 adultos y 1 niña de 6 años",
  ciudades: [
    { name: "Madrid", country: "España", arrivalDate: "2025-09-12", departureDate: "2025-09-16", coordinates: { lat: 40.416775, lng: -3.703790 }, budget: 1500 },
    { name: "Barcelona", country: "España", arrivalDate: "2025-09-16", departureDate: "2025-09-20", coordinates: { lat: 41.3851, lng: 2.1734 }, budget: 1200 },
    { name: "Valencia", country: "España", arrivalDate: "2025-09-20", departureDate: "2025-09-23", coordinates: { lat: 39.4699, lng: -0.3763 }, budget: 800 },
    { name: "Granada", country: "España", arrivalDate: "2025-09-23", departureDate: "2025-09-26", coordinates: { lat: 37.1773, lng: -3.5986 }, budget: 700 },
    { name: "Sevilla", country: "España", arrivalDate: "2025-09-26", departureDate: "2025-09-29", coordinates: { lat: 37.3891, lng: -5.9845 }, budget: 900 },
    { name: "Lisboa", country: "Portugal", arrivalDate: "2025-09-29", departureDate: "2025-10-03", coordinates: { lat: 38.7223, lng: -9.1393 }, budget: 1000 },
    { name: "Roma", country: "Italia", arrivalDate: "2025-10-03", departureDate: "2025-10-07", coordinates: { lat: 41.9028, lng: 12.4964 }, budget: 1300 },
    { name: "París", country: "Francia", arrivalDate: "2025-10-07", departureDate: "2025-10-11", coordinates: { lat: 48.8566, lng: 2.3522 }, budget: 1600 },
    { name: "El Cairo", country: "Egipto", arrivalDate: "2025-10-11", departureDate: "2025-10-15", coordinates: { lat: 30.0444, lng: 31.2357 }, notes: "Visita a Egipto, detalles por confirmar.", budget: 1000 },
  ],
  paises: ["España", "Portugal", "Italia", "Francia", "Egipto"],
  activities: initialActivities,
  expenses: initialExpenses,
};
