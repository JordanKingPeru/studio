
"use client";

import type { City, Expense } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Wallet, TrendingDown, TrendingUp, AlertTriangle, Info, ArrowRightCircle, PartyPopper } from 'lucide-react'; // Added PartyPopper
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BudgetSnapshotProps {
  expenses: Expense[]; 
  currentCity: City | undefined; 
  tripId: string; 
  onNavigateToBudget: () => void;
}

export default function BudgetSnapshot({ expenses, currentCity, tripId, onNavigateToBudget }: BudgetSnapshotProps) {
  const currentCityBudget = useMemo(() => {
    if (!currentCity || typeof currentCity.budget === 'undefined' || currentCity.tripId !== tripId) {
      return null;
    }

    const cityExpenses = expenses.filter(exp => exp.city === currentCity.name && exp.tripId === tripId);
    const totalSpentInCity = cityExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const budget = currentCity.budget;
    const percentageSpent = budget > 0 ? Math.min(Math.max((totalSpentInCity / budget) * 100, 0), 150) : 0;

    let statusMessage = "Presupuesto no definido.";
    let progressColorClass = "";
    let IconComponent = Info;
    let positiveFeedback = "";

    if (typeof budget !== 'undefined') {
        if (percentageSpent <= 50) {
            statusMessage = "¡Vas muy bien!";
            progressColorClass = ""; 
            IconComponent = TrendingUp;
            positiveFeedback = "¡Estás gestionando el presupuesto de maravilla! Considera darte un capricho. 🎉";
        } else if (percentageSpent <= 70) {
            statusMessage = "Controlando gastos.";
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
      statusMessage, progressColorClass, IconComponent, positiveFeedback
    };
  }, [currentCity, expenses, tripId]);

  return (
    <Card className="rounded-xl shadow-lg cursor-pointer hover:shadow-xl transition-shadow" onClick={onNavigateToBudget}>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <Wallet size={22} className="mr-2" />
              {currentCityBudget ? `Presupuesto (${currentCityBudget.name})` : "Presupuesto"}
            </CardTitle>
            <ArrowRightCircle size={20} className="text-muted-foreground group-hover:text-primary transition-colors"/>
        </div>
        {currentCityBudget && (
            <CardDescription className="flex items-center text-sm">
                <currentCityBudget.IconComponent size={16} className={cn("mr-1.5", 
                    currentCityBudget.progressColorClass === "progress-indicator-warning" ? "text-orange-500" :
                    currentCityBudget.progressColorClass === "progress-indicator-danger" ? "text-red-500" :
                    "text-green-500"
                )} />
                {currentCityBudget.statusMessage}
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!currentCityBudget || typeof currentCityBudget.budget === 'undefined' ? (
            <div className="text-center py-4">
                <Info size={28} className="mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                {currentCity ? `No hay presupuesto para ${currentCity.name}.` : "Selecciona ciudad o define presupuesto."}
                </p>
                 <Button variant="link" size="sm" className="mt-1 text-xs" onClick={(e) => { e.stopPropagation(); onNavigateToBudget(); }}>
                    Ir a Presupuesto
                </Button>
            </div>
        ) : (
            <>
                <Progress value={currentCityBudget.percentageSpent} className={cn("h-3 rounded-full", currentCityBudget.progressColorClass)} />
                <div className="text-sm text-muted-foreground">
                Gastado: <span className="font-semibold text-foreground">{currentCityBudget.totalSpentInCity.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span> de <span className="font-semibold text-foreground">{currentCityBudget.budget.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                </div>
                <p className="text-xs font-medium text-accent">
                {Math.round(currentCityBudget.percentageSpent)}% del presupuesto utilizado.
                </p>
                {currentCityBudget.positiveFeedback && (
                    <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-md text-xs text-green-700 dark:text-green-300 flex items-center">
                        <PartyPopper size={16} className="mr-2 shrink-0"/>
                        <span>{currentCityBudget.positiveFeedback}</span>
                    </div>
                )}
            </>
        )}
      </CardContent>
    </Card>
  );
}
