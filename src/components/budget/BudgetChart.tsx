
"use client";

import type { BudgetPerCity, Expense } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface BudgetChartProps {
  expenses: Expense[];
}

const processExpensesForChart = (expenses: Expense[]): BudgetPerCity[] => {
  const expensesByCity: Record<string, number> = {};
  expenses.forEach(expense => {
    expensesByCity[expense.city] = (expensesByCity[expense.city] || 0) + Number(expense.amount || 0);
  });
  return Object.entries(expensesByCity).map(([city, totalCost]) => ({ city, totalCost }));
};

export default function BudgetChart({ expenses }: BudgetChartProps) {
  const chartData = useMemo(() => processExpensesForChart(expenses), [expenses]);
  const totalOverallCost = useMemo(() => expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0), [expenses]);

  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No hay datos de gastos para mostrar el gráfico.</p>;
  }

  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center">
          <TrendingUp size={22} className="mr-2" />
          Gastos por Ciudad
        </CardTitle>
        <CardDescription>Total General: {totalOverallCost.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="city" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(value) => `${value}€`} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                formatter={(value: number) => [`${Number(value || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`, "Coste Total"]}
              />
              <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }} />
              <Bar dataKey="totalCost" name="Coste Total (€)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
