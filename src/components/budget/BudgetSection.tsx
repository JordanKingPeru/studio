
"use client";

import type { Expense, City } from '@/lib/types'; 
import { useState, useMemo } from 'react';
import SectionCard from '@/components/ui/SectionCard';
import BudgetChart from './BudgetChart';
import CumulativeBudgetChart from './CumulativeBudgetChart';
import { PiggyBank, ListOrdered, Euro, Tag, Plus } from 'lucide-react'; // Removed PlusCircle
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';

interface BudgetSectionProps {
  expenses: Expense[];
  tripCities: City[]; 
  tripId: string; 
  onAddExpenseClick: () => void; // Callback to open the AddExpenseModal
}

interface GroupedExpenses {
  [category: string]: {
    expenses: Expense[];
    total: number;
  };
}

export default function BudgetSection({ expenses, tripCities, tripId, onAddExpenseClick }: BudgetSectionProps) {
  
  const currentTripExpenses = useMemo(() => {
    return expenses.filter(exp => exp.tripId === tripId);
  }, [expenses, tripId]);

  const totalOverallCost = useMemo(() => currentTripExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0), [currentTripExpenses]);

  const groupedExpenses = useMemo((): GroupedExpenses => {
    return currentTripExpenses.reduce((acc: GroupedExpenses, expense: Expense) => {
      const category = String(expense.category); // Ensure category is a string
      if (!acc[category]) {
        acc[category] = { expenses: [], total: 0 };
      }
      acc[category].expenses.push(expense);
      acc[category].total += Number(expense.amount || 0);
      return acc;
    }, {});
  }, [currentTripExpenses]);

  // Header actions are removed as FAB is primary action
  return (
    <SectionCard
      id="budget"
      title="Presupuesto y Gastos"
      icon={<PiggyBank size={32} />}
      description={`Sigue tus gastos. Total General: ${totalOverallCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`}
    >
      <div className="space-y-8">
        <BudgetChart expenses={currentTripExpenses} />
        <CumulativeBudgetChart expenses={currentTripExpenses} />

        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <ListOrdered size={22} className="mr-2" />
              Lista de Gastos por Categoría
            </CardTitle>
            <CardDescription>Detalle de todos los gastos registrados, agrupados.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedExpenses).length > 0 ? (
              <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(groupedExpenses).map(([category, data]) => (
                  <AccordionItem key={category} value={category} className="border-none">
                     <Card className="rounded-xl shadow-md overflow-hidden bg-muted/20">
                      <AccordionTrigger className="w-full p-0 hover:no-underline data-[state=closed]:hover:bg-accent/10 data-[state=open]:hover:bg-accent/20 data-[state=open]:bg-accent/10 rounded-t-xl transition-colors">
                        <div className="flex justify-between items-center w-full px-3 py-2 sm:px-4 sm:py-3">
                          <div className="flex items-center gap-2">
                            <Tag size={18} className="text-secondary-foreground shrink-0" />
                            <span className="font-semibold text-sm sm:text-md text-secondary-foreground text-left capitalize">
                              {category}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-base px-3 py-1 bg-primary/10 text-primary border-primary/20">
                            Total: {data.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                        <div className="border-t border-border p-2 sm:p-3 md:p-4 bg-background">
                          {data.expenses.length > 0 ? (
                             <ul className="space-y-3">
                              {data.expenses.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()).map(expense => (
                                <li key={expense.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-muted/30 rounded-lg shadow-sm">
                                  <div>
                                    <p className="font-semibold text-foreground">{expense.description}</p>
                                    <p className="text-sm text-muted-foreground">
                                      En {expense.city} - {format(parseISO(expense.date), "d MMM yyyy", { locale: es })}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="mt-2 sm:mt-0 text-sm px-2.5 py-1">
                                    <Euro size={12} className="mr-1"/>
                                    {Number(expense.amount || 0).toLocaleString('es-ES')}
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          ) : ( <p className="text-muted-foreground text-sm py-3 px-1">No hay gastos.</p> )}
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : ( <p className="text-muted-foreground text-center py-4">No hay gastos registrados.</p> )}
          </CardContent>
        </Card>
      </div>
      {/* Floating Action Button (FAB) for Add Expense */}
      <Button
        className="fixed bottom-20 right-6 sm:bottom-8 sm:right-8 h-14 w-14 rounded-full shadow-xl z-50"
        size="icon"
        onClick={onAddExpenseClick}
        aria-label="Añadir Nuevo Gasto"
      >
        <Plus className="h-7 w-7" />
      </Button>
    </SectionCard>
  );
}
