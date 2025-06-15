
"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, DollarSign, Edit3, TagIcon, TextIcon, MapPinIcon, Loader2 } from 'lucide-react';
import type { City, ExpenseFormData } from '@/lib/types';
import { ExpenseCategory, expenseCategories } from '@/lib/types';

const expenseSchema = z.object({
  description: z.string().min(1, "La descripción es obligatoria."),
  amount: z.number({
    required_error: "El monto es obligatorio.",
    invalid_type_error: "El monto debe ser un número.",
  }).positive("El monto debe ser positivo."),
  category: z.nativeEnum(ExpenseCategory, {
    required_error: "La categoría es obligatoria.",
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  city: z.string().min(1, "La ciudad es obligatoria."),
  tripId: z.string(), // To associate expense with the trip
});

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => Promise<void>;
  cities: City[]; // Cities for the current trip
  tripId: string;
  initialData?: Partial<ExpenseFormData> | null; // For editing in future
}

export default function AddExpenseModal({ isOpen, onClose, onSubmit, cities, tripId, initialData }: AddExpenseModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: initialData?.description || '',
      amount: initialData?.amount || undefined,
      category: initialData?.category || ExpenseCategory.OTROS,
      date: initialData?.date || new Date().toISOString().split('T')[0],
      city: initialData?.city || cities[0]?.name || '',
      tripId: initialData?.tripId || tripId,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        description: initialData?.description || '',
        amount: initialData?.amount || undefined,
        category: initialData?.category || ExpenseCategory.OTROS,
        date: initialData?.date || new Date().toISOString().split('T')[0],
        city: initialData?.city || cities.find(c=> c.tripId === tripId)?.[0]?.name || cities[0]?.name || '',
        tripId: initialData?.tripId || tripId,
      });
      setIsSubmitting(false);
    }
  }, [isOpen, initialData, cities, tripId, form]);

  const handleSubmitInternal = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      // onClose(); // Caller should handle close on success
    } catch (error) {
      // Error handled by caller's toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    if (!isSubmitting) {
      onClose();
    }
  };
  
  const currentTripCities = cities.filter(c => c.tripId === tripId);

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-md rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <Edit3 className="mr-2" />
            {initialData?.id ? 'Editar Gasto' : 'Añadir Nuevo Gasto'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitInternal)} className="space-y-5 py-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><TextIcon className="mr-2 h-4 w-4 text-muted-foreground" />Descripción</FormLabel>
                  <FormControl><Input placeholder="Ej: Cena en restaurante local" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />Monto</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej: 35.50" 
                      {...field} 
                      value={field.value === undefined ? '' : field.value}
                      onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><TagIcon className="mr-2 h-4 w-4 text-muted-foreground" />Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {expenseCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground" />Ciudad</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || (currentTripCities[0]?.name || '')}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona ciudad" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {currentTripCities.map(city => (<SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" variant="default" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData?.id ? 'Guardar Cambios' : 'Añadir Gasto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
