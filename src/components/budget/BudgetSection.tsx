"use client";

import type { TripDetails, Expense } from '@/lib/types';
import { useState } from 'react';
import SectionCard from '@/components/ui/SectionCard';
import BudgetChart from './BudgetChart';
import { PiggyBank, PlusCircle, ListOrdered, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '../ui/badge';
// Placeholder for ExpenseForm - can be a Dialog similar to ActivityForm
// import ExpenseForm from './ExpenseForm'; 

interface BudgetSectionProps {
  initialTripData: TripDetails;
}

export default function BudgetSection({ initialTripData }: BudgetSectionProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialTripData.expenses);
  // const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  // const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleAddExpense = (expense: Expense) => {
    setExpenses(prev => [...prev, expense]);
    // setIsExpenseFormOpen(false);
  };

  const totalOverallCost = expenses.reduce((sum, exp) => sum + exp.amount, 0);

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
        
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <ListOrdered size={22} className="mr-2" />
              Lista de Gastos
            </CardTitle>
            <CardDescription>Detalle de todos los gastos registrados.</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length > 0 ? (
              <ul className="space-y-3">
                {expenses.map(expense => (
                  <li key={expense.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-semibold text-foreground">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="capitalize">{expense.category}</span> en {expense.city} - {format(parseISO(expense.date), "d MMM yyyy", { locale: es })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="mt-2 sm:mt-0 text-base px-3 py-1 bg-primary/10 text-primary border-primary/20">
                      <Euro size={14} className="mr-1"/>
                      {expense.amount.toLocaleString('es-ES')}
                    </Badge>
                  </li>
                ))}
              </ul>
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
          cities={initialTripData.ciudades}
          initialData={editingExpense}
        />
        */}
      </div>
    </SectionCard>
  );
}
