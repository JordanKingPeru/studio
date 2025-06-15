
"use client";

import type { City, Expense } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wallet, TrendingDown, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface BudgetSnapshotProps {
  expenses: Expense[]; // Should be pre-filtered for the current trip
  currentCity: City | undefined; // City object for the current city today
  tripId: string; // Added tripId for context
}

export default function BudgetSnapshot({ expenses, currentCity, tripId }: BudgetSnapshotProps) {
  // Expenses are already filtered by tripId by the parent (DashboardView)
  // currentCity should also belong to the current tripId

  const currentCityBudget = useMemo(() => {
    if (!currentCity || typeof currentCity.budget === 'undefined' || currentCity.tripId !== tripId) {
      // Also check if currentCity belongs to the current trip
      return null;
    }

    const cityExpenses = expenses.filter(exp => exp.city === currentCity.name && exp.tripId === tripId);
    const totalSpentInCity = cityExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const budget = currentCity.budget;
    const percentageSpent = budget > 0 ? Math.min(Math.max((totalSpentInCity / budget) * 100, 0), 150) : 0;

    let statusMessage = "Presupuesto no definido.";
    let progressColorClass = "";
    let IconComponent = Info;

    if (typeof budget !== 'undefined') {
        if (percentageSpent <= 70) {
        statusMessage = "¡Vas muy bien!";
        progressColorClass = ""; 
        IconComponent = TrendingUp;
        } else if (percentageSpent <= 90) {
        statusMessage = "¡Ojo! Acercándote al límite.";
        progressColorClass = "progress-indicator-warning";
        IconComponent = AlertTriangle;
        } else {
        statusMessage = "Has excedido el presupuesto.";
        progressColorClass = "progress-indicator-danger";
        IconComponent = TrendingDown;
        }
    }
    
    return {
      name: currentCity.name, budget, totalSpentInCity, percentageSpent,
      statusMessage, progressColorClass, IconComponent,
    };
  }, [currentCity, expenses, tripId]);

  if (!currentCityBudget || typeof currentCityBudget.budget === 'undefined') {
    return (
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary flex items-center">
            <Wallet size={22} className="mr-2" />Presupuesto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Info size={28} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {currentCity ? `No hay presupuesto para ${currentCity.name}.` : "Selecciona ciudad."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { name, budget, totalSpentInCity, percentageSpent, statusMessage, progressColorClass, IconComponent } = currentCityBudget;

  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center">
          <Wallet size={22} className="mr-2" />Presupuesto de {name}
        </CardTitle>
        <CardDescription className="flex items-center text-sm">
            <IconComponent size={16} className={cn("mr-1.5", 
                progressColorClass === "progress-indicator-warning" ? "text-orange-500" :
                progressColorClass === "progress-indicator-danger" ? "text-red-500" :
                "text-green-500"
            )} />
            {statusMessage}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={percentageSpent} className={cn("h-3 rounded-full", progressColorClass)} />
        <div className="text-sm text-muted-foreground">
          Gastado: <span className="font-semibold text-foreground">{totalSpentInCity.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span> de <span className="font-semibold text-foreground">{budget.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
        </div>
        <p className="text-xs font-medium text-accent">
          {Math.round(percentageSpent)}% del presupuesto utilizado.
        </p>
      </CardContent>
    </Card>
  );
}
