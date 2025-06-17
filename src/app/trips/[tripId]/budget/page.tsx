
"use client";

import BudgetSection from '@/components/budget/BudgetSection';
import { useParams } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Trip, TripDetails, Expense, Activity, City, ExpenseFormData } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy as firestoreOrderBy, addDoc, serverTimestamp, doc, setDoc, getDoc as getFirestoreDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import AddExpenseModal from '@/components/budget/AddExpenseModal';

// Function to fetch base trip data from Firestore
async function fetchBaseTripData(tripId: string): Promise<Trip | null> {
  const tripRef = doc(db, "trips", tripId);
  const tripSnap = await getFirestoreDoc(tripRef);
  if (!tripSnap.exists()) {
    console.warn(`Base trip data for ID ${tripId} not found.`);
    return null;
  }
  const data = tripSnap.data();
  return {
    id: tripSnap.id,
    ownerUid: data.ownerUid, // Changed from userId
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    coverImageUrl: data.coverImageUrl,
    tripType: data.tripType,
    tripStyle: data.tripStyle,
    editorUids: data.editorUids || [],
    pendingInvites: data.pendingInvites || [],
    familia: data.familia,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAt || Date.now()).toISOString(),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date(data.updatedAt || Date.now()).toISOString(),
  } as Trip;
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
    try {
      const activitiesCollectionRef = collection(db, "trips", tripId, "activities");
      const activitiesQuery = query(activitiesCollectionRef, firestoreOrderBy("date"), firestoreOrderBy("order"), firestoreOrderBy("time"));
      const activitiesSnapshot = await getDocs(activitiesQuery);
      const fetchedActivities: Activity[] = activitiesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), tripId } as Activity));
      setActivities(fetchedActivities);

      const citiesCollectionRef = collection(db, "trips", tripId, "cities");
      const citiesQuery = query(citiesCollectionRef, firestoreOrderBy("arrivalDate"));
      const citiesSnapshot = await getDocs(citiesQuery);
      const fetchedCities: City[] = citiesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), tripId } as City));
      setCities(fetchedCities);

      const expensesCollectionRef = collection(db, "trips", tripId, "expenses");
      const expensesQuery = query(expensesCollectionRef, firestoreOrderBy("date", "desc"));
      const expensesSnapshot = await getDocs(expensesQuery);
      const fetchedManualExpenses: Expense[] = expensesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), tripId } as Expense));
      setManualExpenses(fetchedManualExpenses);

      setTripData(prev => {
        if (!prev) return null;
        const derivedExpenses = fetchedActivities
            .filter(activity => typeof activity.cost === 'number' && activity.cost > 0)
            .map(activity => ({
                id: `${activity.id}-expense`, tripId: activity.tripId, city: activity.city, date: activity.date,
                category: activity.category, description: activity.title, amount: Number(activity.cost || 0),
            }));
        const allExpenses = [...derivedExpenses, ...fetchedManualExpenses];
        const paises = Array.from(new Set(fetchedCities.map(city => city.country)));

        return { ...prev, activities: fetchedActivities, ciudades: fetchedCities, expenses: allExpenses, paises, userId: prev.ownerUid };
      });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar datos para presupuesto: ${error.message}` });
    }
  }, [tripId, toast]);


  useEffect(() => {
    let isMounted = true;
    if (tripId) {
      const loadInitialData = async () => {
        if (!isMounted) return;
        setIsLoading(true);
        try {
            const baseTrip = await fetchBaseTripData(tripId);
            if (!isMounted) return;

            if (baseTrip) {
                setTripData({
                    ...baseTrip,
                    userId: baseTrip.ownerUid, // Ensure userId is set for TripDetails compatibility
                    activities: [], ciudades: [], expenses: [], paises: [],
                });
                await fetchTripSubCollections();
            } else {
                 toast({ variant: "destructive", title: "Error", description: `No se encontraron datos del viaje con ID: ${tripId}.`});
                 setTripData(null);
            }
        } catch (e) {
            if (!isMounted) return;
            toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar datos del presupuesto.`});
            console.error("Error loading initial budget data:", e);
            setTripData(null);
        } finally {
            if(isMounted) {
                 setIsLoading(false);
            }
        }
      };
      loadInitialData();
    } else {
        setIsLoading(false);
        setTripData(null);
    }
     return () => { isMounted = false; };
  }, [tripId, fetchTripSubCollections, toast]);

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
    const newExpenseToSave: Expense = {
        id: newExpenseRef.id,
        tripId,
        city: expenseData.city,
        date: expenseData.date,
        category: expenseData.category,
        description: expenseData.description,
        amount: expenseData.amount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    try {
        await setDoc(newExpenseRef, newExpenseToSave);
        toast({ title: "Gasto Añadido", description: `"${expenseData.description}" añadido correctamente.` });
        fetchTripSubCollections();
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
    <div className="py-8 relative">
      <BudgetSection
        expenses={allExpenses}
        tripCities={cities}
        tripId={tripId}
        onAddExpenseClick={() => setIsExpenseModalOpen(true)}
      />
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleAddExpense}
        cities={cities.filter(c => c.tripId === tripId)}
        tripId={tripId}
      />
    </div>
  );
}
