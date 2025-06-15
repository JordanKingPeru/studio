
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Trip } from '@/lib/types';
import { TripType, TripStyle } from '@/lib/types';
import { ChevronLeft, ChevronRight, ArrowRight, Rocket, Camera, Users, CalendarDays, Type, Palette, Upload } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const tripSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio inválida."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de fin inválida."),
  coverImageUrl: z.string().url("URL de imagen inválida.").optional().or(z.literal('')),
  tripType: z.nativeEnum(TripType),
  tripStyle: z.nativeEnum(TripStyle),
  collaborators: z.string().optional(), // Simple text area for emails for now
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: "La fecha de fin debe ser posterior o igual a la fecha de inicio.",
  path: ["endDate"],
});

type TripFormData = z.infer<typeof tripSchema>;

interface CreateTripWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (tripData: Omit<Trip, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
}

const todayDate = new Date().toISOString().split('T')[0];
const oneWeekLaterDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export default function CreateTripWizard({ isOpen, onClose, onTripCreated }: CreateTripWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const { control, handleSubmit, formState: { errors, isValid }, trigger, watch, reset } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    mode: 'onChange', // Validate on change for better UX
    defaultValues: {
      name: '',
      startDate: todayDate,
      endDate: oneWeekLaterDate,
      coverImageUrl: '',
      tripType: TripType.LEISURE,
      tripStyle: TripStyle.FAMILY,
      collaborators: '',
    }
  });
  
  useEffect(() => {
    if (isOpen) {
        reset({ // Reset form when dialog opens
            name: '',
            startDate: todayDate,
            endDate: oneWeekLaterDate,
            coverImageUrl: '',
            tripType: TripType.LEISURE,
            tripStyle: TripStyle.FAMILY,
            collaborators: '',
        });
        setStep(1);
    }
  }, [isOpen, reset]);

  const nextStep = async () => {
    let fieldsToValidate: (keyof TripFormData)[] = [];
    if (step === 1) fieldsToValidate = ['name', 'startDate', 'endDate', 'coverImageUrl'];
    if (step === 2) fieldsToValidate = ['tripType', 'tripStyle'];
    
    const isValidStep = await trigger(fieldsToValidate);
    if (isValidStep) {
      setStep(s => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmit = (data: TripFormData) => {
    onTripCreated(data);
    onClose(); // Close dialog after submission
  };

  const progressPercentage = (step / totalSteps) * 100;
  
  const renderStepContent = () => {
    switch (step) {
      case 1: // Lo Esencial
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center"><Rocket className="mr-2 h-5 w-5 text-primary" />Paso 1: Lo Esencial</h3>
            <div>
              <Label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">Nombre del Viaje</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="name" placeholder="Ej: Aventura por el Sudeste Asiático" {...field} />}
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="mb-1 block text-sm font-medium text-foreground">Fecha de Inicio</Label>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => <Input id="startDate" type="date" {...field} />}
                />
                {errors.startDate && <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <Label htmlFor="endDate" className="mb-1 block text-sm font-medium text-foreground">Fecha de Fin</Label>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => <Input id="endDate" type="date" {...field} />}
                />
                {errors.endDate && <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="coverImageUrl" className="mb-1 block text-sm font-medium text-foreground">
                <Camera className="inline mr-2 h-4 w-4" />Foto de Portada (URL opcional)
              </Label>
              <Controller
                name="coverImageUrl"
                control={control}
                render={({ field }) => <Input id="coverImageUrl" placeholder="https://ejemplo.com/imagen.jpg" {...field} />}
              />
              {errors.coverImageUrl && <p className="text-sm text-destructive mt-1">{errors.coverImageUrl.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">Pega la URL de una imagen inspiradora. Para la subida real, necesitaríamos un servicio de almacenamiento.</p>
            </div>
          </div>
        );
      case 2: // El Contexto
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" />Paso 2: El Contexto</h3>
            <div>
              <Label className="mb-2 block text-sm font-medium text-foreground"><Type className="inline mr-2 h-4 w-4" />Tipo de Viaje</Label>
              <Controller
                name="tripType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
                    <SelectContent>
                      {Object.values(TripType).map(type => (
                        <SelectItem key={type} value={type}>{type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tripType && <p className="text-sm text-destructive mt-1">{errors.tripType.message}</p>}
            </div>
            <div>
              <Label className="mb-2 block text-sm font-medium text-foreground"><Palette className="inline mr-2 h-4 w-4" />Estilo de Viaje</Label>
              <Controller
                name="tripStyle"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger><SelectValue placeholder="Selecciona estilo" /></SelectTrigger>
                    <SelectContent>
                      {Object.values(TripStyle).map(style => (
                        <SelectItem key={style} value={style}>{style.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.tripStyle && <p className="text-sm text-destructive mt-1">{errors.tripStyle.message}</p>}
            </div>
             <p className="text-xs text-muted-foreground mt-1">Estos datos ayudarán a la IA a personalizar sugerencias.</p>
          </div>
        );
      case 3: // Colaboradores
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Paso 3: Colaboradores (Opcional)</h3>
            <div>
              <Label htmlFor="collaborators" className="mb-1 block text-sm font-medium text-foreground">Invitar por email (separados por coma)</Label>
              <Controller
                name="collaborators"
                control={control}
                render={({ field }) => <Textarea id="collaborators" placeholder="email1@ejemplo.com, email2@ejemplo.com" {...field} rows={3} />}
              />
              {errors.collaborators && <p className="text-sm text-destructive mt-1">{errors.collaborators.message}</p>}
            </div>
             <p className="text-xs text-muted-foreground mt-1">La funcionalidad completa de colaboración se implementará más adelante.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setStep(1); } }}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-headline text-primary">Crear Nuevo Viaje</DialogTitle>
          <DialogDescription>Planifica tu próxima aventura paso a paso.</DialogDescription>
        </DialogHeader>
        
        <div className="px-6 py-3">
            <Progress value={progressPercentage} className="w-full h-2 mb-4" />
            <p className="text-sm text-muted-foreground text-center">Paso {step} de {totalSteps}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {renderStepContent()}
        </form>

        <DialogFooter className="p-6 pt-4 border-t flex justify-between w-full">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={prevStep}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
            </Button>
          ) : (
            <DialogClose asChild>
                <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            </DialogClose>
          )}

          {step < totalSteps ? (
            <Button type="button" onClick={nextStep}>
              Siguiente <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit(onSubmit)} disabled={!isValid}>
              Crear Viaje <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
