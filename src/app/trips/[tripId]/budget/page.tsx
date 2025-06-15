
"use client";

import BudgetSection from '@/components/budget/BudgetSection';
import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { TripDetails, Expense, Activity, City, ExpenseFormData } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy as firestoreOrderBy, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import AddExpenseModal from '@/components/budget/AddExpenseModal';

// Mock function to fetch full trip details
async function fetchFullTripDataForBudget(tripId: string): Promise<TripDetails | null> {
  await new Promise(resolve => setTimeout(resolve, 500));
  const storedTrips = localStorage.getItem('familyTrips');
  if (storedTrips) {
    const trips: TripDetails[] = JSON.parse(storedTrips);
    const currentTrip = trips.find(t => t.id === tripId);
     if (currentTrip) {
      const { sampleTripDetails } = await import('@/lib/constants');
      // Ensure all sub-collections get the correct tripId
      const activities = (currentTrip.activities || sampleTripDetails.activities).map(a => ({ ...a, tripId }));
      const ciudades = (currentTrip.ciudades || sampleTripDetails.ciudades).map(c => ({ ...c, tripId }));
      const expenses = (currentTrip.expenses || sampleTripDetails.expenses).map(e => ({ ...e, tripId }));
      
      return {
        ...sampleTripDetails,
        ...currentTrip,
        id: tripId,
        activities,
        ciudades,
        expenses, // Use the processed expenses which include manual and derived
      };
    }
  }
  const { sampleTripDetails } = await import('@/lib/constants');
  if (tripId === sampleTripDetails.id) return sampleTripDetails;
  return null;
}

export default function TripBudgetPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [tripData, setTripData] = useState<TripDetails | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [manualExpenses, setManualExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const { toast } = useToast();

  const fetchTripSubCollections = useCallback(async () => {
    if (!tripId) return;
    // setIsLoading(true); // Only set loading if it's not already handled by initial load
    try {
      // Fetch Activities (for deriving expenses)
      const activitiesCollectionRef = collection(db, "trips", tripId, "activities");
      const activitiesQuery = query(activitiesCollectionRef, firestoreOrderBy("date"), firestoreOrderBy("order"), firestoreOrderBy("time"));
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const fetchedActivities: Activity[] = activitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tripId } as Activity));
      setActivities(fetchedActivities);

      // Fetch Cities
      const citiesCollectionRef = collection(db, "trips", tripId, "cities");
      const citiesQuery = query(citiesCollectionRef, firestoreOrderBy("arrivalDate"));
      const citiesSnapshot = await getDocs(citiesQuery);
      const fetchedCities: City[] = citiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tripId } as City));
      setCities(fetchedCities);
      
      // Fetch Manual Expenses
      const expensesCollectionRef = collection(db, "trips", tripId, "expenses");
      const expensesQuery = query(expensesCollectionRef, firestoreOrderBy("date", "desc"));
      const expensesSnapshot = await getDocs(expensesQuery);
      const fetchedManualExpenses: Expense[] = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), tripId } as Expense));
      setManualExpenses(fetchedManualExpenses);

      if (tripData) {
          setTripData(prev => prev ? ({
            ...prev, 
            activities: fetchedActivities, 
            ciudades: fetchedCities,
            // expenses will be derived below using fetchedManualExpenses and fetchedActivities
        }) : null);
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar datos para presupuesto: ${error.message}` });
    } finally {
      setIsLoading(false); // Ensure loading is set to false after all fetches
    }
  }, [tripId, toast, tripData]);


  useEffect(() => {
    if (tripId) {
      const loadInitialData = async () => {
        setIsLoading(true);
        const initialData = await fetchFullTripDataForBudget(tripId);
        setTripData(initialData);
        if (initialData) {
          setActivities(initialData.activities || []);
          setCities(initialData.ciudades || []);
          setManualExpenses(initialData.expenses?.filter(e => !e.id.includes('-expense')) || []); // Filter out derived for manual
        }
        await fetchTripSubCollections();
      };
      loadInitialData();
    }
  }, [tripId, fetchTripSubCollections]);

  const derivedExpensesFromActivities = useMemo((): Expense[] => {
    return activities
      .filter(activity => typeof activity.cost === 'number' && activity.cost > 0)
      .map(activity => ({
        id: `${activity.id}-expense`,
        tripId: activity.tripId,
        city: activity.city,
        date: activity.date,
        category: activity.category,
        description: activity.title,
        amount: Number(activity.cost || 0),
      }));
  }, [activities]);

  const allExpenses = useMemo(() => {
    return [...derivedExpensesFromActivities, ...manualExpenses];
  }, [derivedExpensesFromActivities, manualExpenses]);

  const handleAddExpense = async (expenseData: ExpenseFormData) => {
    if (!tripId) return;
    const newExpenseRef = doc(collection(db, "trips", tripId, "expenses"));
    const newExpense: Expense = {
        ...expenseData,
        id: newExpenseRef.id,
        tripId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    try {
        await setDoc(newExpenseRef, newExpense);
        toast({ title: "Gasto Añadido", description: `"${expenseData.description}" añadido correctamente.` });
        fetchTripSubCollections(); // Re-fetch all data to update UI
        setIsExpenseModalOpen(false);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error al Añadir Gasto", description: error.message });
    }
  };


  if (isLoading || !tripData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando presupuesto...</p>
      </div>
    );
  }
  
  return (
    <div className="py-8 relative"> {/* Added relative for FAB positioning context */}
      <BudgetSection
        expenses={allExpenses} // Pass combined expenses
        tripCities={cities} 
        tripId={tripId}
        onAddExpenseClick={() => setIsExpenseModalOpen(true)}
      />
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleAddExpense}
        cities={cities.filter(c => c.tripId === tripId)} // Ensure cities are for the current trip
        tripId={tripId}
      />
    </div>
  );
}
