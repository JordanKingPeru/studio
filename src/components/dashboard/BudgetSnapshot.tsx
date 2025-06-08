
"use client";

import type { City, Expense } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wallet, TrendingDown, TrendingUp, AlertTriangle, Info } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface BudgetSnapshotProps {
  expenses: Expense[];
  currentCity: City | undefined;
}

export default function BudgetSnapshot({ expenses, currentCity }: BudgetSnapshotProps) {
  const currentCityBudget = useMemo(() => {
    if (!currentCity || typeof currentCity.budget === 'undefined') {
      return null;
    }

    const cityExpenses = expenses.filter(exp => exp.city === currentCity.name);
    const totalSpentInCity = cityExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const budget = currentCity.budget;
    const percentageSpent = budget > 0 ? Math.min(Math.max((totalSpentInCity / budget) * 100, 0), 150) : 0; // Cap at 150% for visual

    let statusMessage = "Presupuesto no definido para esta ciudad.";
    let progressColorClass = "";
    let IconComponent = Info;

    if (typeof budget !== 'undefined') {
        if (percentageSpent <= 70) {
        statusMessage = "¡Vas muy bien con el presupuesto!";
        progressColorClass = ""; // Default primary color
        IconComponent = TrendingUp;
        } else if (percentageSpent <= 90) {
        statusMessage = "¡Ojo! Te estás acercando al límite del presupuesto.";
        progressColorClass = "progress-indicator-warning";
        IconComponent = AlertTriangle;
        } else {
        statusMessage = "Has excedido el presupuesto para esta ciudad.";
        progressColorClass = "progress-indicator-danger";
        IconComponent = TrendingDown;
        }
    }
    
    return {
      name: currentCity.name,
      budget,
      totalSpentInCity,
      percentageSpent,
      statusMessage,
      progressColorClass,
      IconComponent,
    };
  }, [currentCity, expenses]);

  if (!currentCityBudget || typeof currentCityBudget.budget === 'undefined') {
    return (
      <Card className="rounded-xl shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary flex items-center">
            <Wallet size={22} className="mr-2" />
            Presupuesto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <Info size={28} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {currentCity ? `No hay presupuesto definido para ${currentCity.name}.` : "Selecciona una ciudad para ver el presupuesto."}
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
          <Wallet size={22} className="mr-2" />
          Presupuesto de {name}
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
