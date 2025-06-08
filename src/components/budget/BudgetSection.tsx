
"use client";

import type { Expense, City } from '@/lib/types'; // Added City
import { useState, useMemo } from 'react';
import SectionCard from '@/components/ui/SectionCard';
import BudgetChart from './BudgetChart';
import CumulativeBudgetChart from './CumulativeBudgetChart';
import { PiggyBank, PlusCircle, ListOrdered, Euro, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
// Placeholder for ExpenseForm - can be a Dialog similar to ActivityForm
// import ExpenseForm from './ExpenseForm';

interface BudgetSectionProps {
  expenses: Expense[];
  tripCities: City[]; // Needed if we implement Add Expense Form later
}

interface GroupedExpenses {
  [category: string]: {
    expenses: Expense[];
    total: number;
  };
}

export default function BudgetSection({ expenses, tripCities }: BudgetSectionProps) {
  // const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  // const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // const handleAddExpense = (expense: Expense) => {
  //   // This would typically call a prop function to add/update in Firestore
  //   // For now, if BudgetSection managed its own state (which it no longer does):
  //   // setExpenses(prev => [...prev, expense]);
  //   // setIsExpenseFormOpen(false);
  //   // setEditingExpense(null);
  //   alert("Simulating adding expense: " + expense.description);
  // };

  const totalOverallCost = useMemo(() => expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0), [expenses]);

  const groupedExpenses = useMemo((): GroupedExpenses => {
    return expenses.reduce((acc: GroupedExpenses, expense: Expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = { expenses: [], total: 0 };
      }
      acc[category].expenses.push(expense);
      acc[category].total += Number(expense.amount || 0);
      return acc;
    }, {});
  }, [expenses]);

  const headerActions = (
    <Button onClick={() => alert("Próximamente: Añadir nuevo gasto")} disabled>
      <PlusCircle size={20} className="mr-2" />
      Añadir Gasto
    </Button>
  );


  return (
    <SectionCard
      id="budget"
      title="Presupuesto y Gastos"
      icon={<PiggyBank size={32} />}
      description={`Sigue tus gastos y mantén el presupuesto bajo control. Total General: ${totalOverallCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`}
      headerActions={headerActions}
    >
      <div className="space-y-8">
        <BudgetChart expenses={expenses} />
        <CumulativeBudgetChart expenses={expenses} />

        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <ListOrdered size={22} className="mr-2" />
              Lista de Gastos por Categoría
            </CardTitle>
            <CardDescription>Detalle de todos los gastos registrados, agrupados por categoría.</CardDescription>
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
                          ) : (
                             <p className="text-muted-foreground text-sm py-3 px-1">No hay gastos en esta categoría.</p>
                          )}
                        </div>
                      </AccordionContent>
                    </Card>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
               <p className="text-muted-foreground text-center py-4">No hay gastos registrados.</p>
            )}
          </CardContent>
        </Card>
        {/* Placeholder for ExpenseForm Dialog
        <ExpenseForm
          isOpen={isExpenseFormOpen}
          onClose={() => setIsExpenseFormOpen(false)}
          onSubmit={handleAddExpense}
          cities={tripCities} // Pass tripCities here
          initialData={editingExpense}
        />
        */}
      </div>
    </SectionCard>
  );
}
