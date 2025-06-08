
"use client";

import type { Expense } from '@/lib/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react'; // Using Activity icon as a proxy for Area/Trend
import { useMemo } from 'react';
import { format, parseISO, compareAsc } from 'date-fns';
import { es } from 'date-fns/locale';

interface CumulativeBudgetChartProps {
  expenses: Expense[];
}

interface CumulativeChartDataPoint {
  date: string; // Formatted date string for display
  timestamp: number; // For sorting
  cumulativeAmount: number;
}

const processExpensesForCumulativeChart = (expenses: Expense[]): CumulativeChartDataPoint[] => {
  if (!expenses || expenses.length === 0) {
    return [];
  }

  // Sort expenses by date to ensure correct cumulative calculation
  const sortedExpenses = [...expenses].sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));

  const dailyTotals: Record<string, number> = {};
  sortedExpenses.forEach(expense => {
    dailyTotals[expense.date] = (dailyTotals[expense.date] || 0) + expense.amount;
  });

  const uniqueSortedDates = Object.keys(dailyTotals).sort((a,b) => compareAsc(parseISO(a), parseISO(b)));
  
  let cumulativeAmount = 0;
  const chartData: CumulativeChartDataPoint[] = [];

  for (const dateStr of uniqueSortedDates) {
    cumulativeAmount += dailyTotals[dateStr];
    chartData.push({
      date: format(parseISO(dateStr), "d MMM yy", { locale: es }),
      timestamp: parseISO(dateStr).getTime(),
      cumulativeAmount,
    });
  }
  
  return chartData;
};

export default function CumulativeBudgetChart({ expenses }: CumulativeBudgetChartProps) {
  const chartData = useMemo(() => processExpensesForCumulativeChart(expenses), [expenses]);
  const finalCumulativeAmount = chartData.length > 0 ? chartData[chartData.length - 1].cumulativeAmount : 0;

  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No hay datos de gastos para mostrar el gráfico acumulativo.</p>;
  }

  return (
    <Card className="rounded-xl shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary flex items-center">
          <Activity size={22} className="mr-2" />
          Gasto Acumulado en el Tiempo
        </CardTitle>
        <CardDescription>Total Acumulado Final: {finalCumulativeAmount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
                tickFormatter={(value) => `${value}€`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                formatter={(value: number, name: string) => {
                    if (name === "Gasto Acumulado") {
                         return [`${value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`, "Acumulado"];
                    }
                    return [value, name];
                }}
              />
              <Legend wrapperStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }} />
              <Area type="monotone" dataKey="cumulativeAmount" name="Gasto Acumulado" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
