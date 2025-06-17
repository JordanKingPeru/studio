
"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Trip } from '@/lib/types'; // Keep this for the output type
import { TripType, TripStyle } from '@/lib/types';
import { ChevronLeft, ChevronRight, ArrowRight, Rocket, Palette, Users, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateTripCoverImage, type GenerateTripCoverImageInput } from '@/ai/flows/generate-trip-cover-image';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image'; // For preview

// Extended Zod schema for form data including AI prompt fields
const tripWizardSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio inválida."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de fin inválida."),
  // Traveler details for AI prompt
  numTravelers: z.number().min(1, "Debe haber al menos 1 viajero.").optional().nullable(),
  numAdults: z.number().min(0, "Número de adultos no puede ser negativo.").optional().nullable(),
  numChildren: z.number().min(0, "Número de niños no puede ser negativo.").optional().nullable(),
  childrenAges: z.string().optional(), // e.g., "5, 8, 12"
  // Cover image will be a data URI from AI or empty
  coverImageUrl: z.string().optional().or(z.literal('')),
  tripType: z.nativeEnum(TripType),
  tripStyle: z.nativeEnum(TripStyle),
  collaborators: z.string().optional(),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: "La fecha de fin debe ser posterior o igual a la fecha de inicio.",
  path: ["endDate"],
}).refine(data => {
  if (data.numTravelers !== undefined && data.numTravelers !== null &&
      data.numAdults !== undefined && data.numAdults !== null &&
      data.numChildren !== undefined && data.numChildren !== null) {
    return data.numTravelers === data.numAdults + data.numChildren;
  }
  return true;
}, {
  message: "El total de viajeros debe ser la suma de adultos y niños.",
  path: ["numTravelers"],
});

type TripWizardFormData = z.infer<typeof tripWizardSchema>;

interface CreateTripWizardProps {
  isOpen: boolean;
  onClose: () => void;
  // This callback expects data matching the core Trip structure, excluding AI-specific fields
  onTripCreated: (tripData: Omit<Trip, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => void;
}

const todayDate = new Date().toISOString().split('T')[0];
const oneWeekLaterDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export default function CreateTripWizard({ isOpen, onClose, onTripCreated }: CreateTripWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const { toast } = useToast();
  const [isGeneratingCoverImage, setIsGeneratingCoverImage] = useState(false);
  const [generatedCoverImagePreview, setGeneratedCoverImagePreview] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isValid: isFormValid }, trigger, watch, reset, setValue, getValues } = useForm<TripWizardFormData>({
    resolver: zodResolver(tripWizardSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      startDate: todayDate,
      endDate: oneWeekLaterDate,
      numTravelers: 1,
      numAdults: 1,
      numChildren: 0,
      childrenAges: '',
      coverImageUrl: '',
      tripType: TripType.LEISURE,
      tripStyle: TripStyle.FAMILY,
      collaborators: '',
    }
  });

  const watchedCoverImageUrl = watch('coverImageUrl');

  useEffect(() => {
    if (isOpen) {
        reset({
            name: '',
            startDate: todayDate,
            endDate: oneWeekLaterDate,
            numTravelers: 1,
            numAdults: 1,
            numChildren: 0,
            childrenAges: '',
            coverImageUrl: '',
            tripType: TripType.LEISURE,
            tripStyle: TripStyle.FAMILY,
            collaborators: '',
        });
        setStep(1);
        setGeneratedCoverImagePreview(null);
        setIsGeneratingCoverImage(false);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    // Sync preview if coverImageUrl is set (e.g., by AI)
    setGeneratedCoverImagePreview(watchedCoverImageUrl || null);
  }, [watchedCoverImageUrl]);


  const handleGenerateCoverImage = async () => {
    // Fields needed for prompt: name, startDate, endDate, tripType, tripStyle, numTravelers, numAdults, numChildren, childrenAges
    const currentValues = getValues();
    const { name, startDate, endDate, tripType, tripStyle, numTravelers, numAdults, numChildren, childrenAges } = currentValues;

    if (!name || !startDate || !endDate || !tripType || !tripStyle ) {
        toast({
            variant: "destructive",
            title: "Faltan Datos",
            description: "Por favor, completa el nombre, fechas, tipo y estilo del viaje antes de generar la portada.",
        });
        return;
    }
    
    const aiInput: GenerateTripCoverImageInput = {
      tripName: name,
      startDate,
      endDate,
      tripType,
      tripStyle,
      numTravelers: numTravelers ?? 1,
      numAdults: numAdults ?? 1,
      numChildren: numChildren ?? 0,
      childrenAges: childrenAges || '',
    };

    setIsGeneratingCoverImage(true);
    setGeneratedCoverImagePreview(null);
    try {
      const result = await generateTripCoverImage(aiInput);
      if (result.imageDataUri) {
        setValue('coverImageUrl', result.imageDataUri, { shouldValidate: true });
        setGeneratedCoverImagePreview(result.imageDataUri);
        toast({ title: "¡Portada Generada!", description: "La imagen de portada ha sido creada." });
      } else {
        throw new Error("La IA no devolvió una imagen.");
      }
    } catch (error) {
      console.error("Error generating cover image:", error);
      toast({
        variant: "destructive",
        title: "Error al Generar Portada",
        description: `No se pudo crear la imagen: ${(error as Error).message}`,
      });
    } finally {
      setIsGeneratingCoverImage(false);
    }
  };


  const nextStep = async () => {
    let fieldsToValidate: (keyof TripWizardFormData)[] = [];
    if (step === 1) fieldsToValidate = ['name', 'startDate', 'endDate', 'numTravelers', 'numAdults', 'numChildren', 'childrenAges'];
    if (step === 2) fieldsToValidate = ['tripType', 'tripStyle', 'coverImageUrl']; // coverImageUrl is optional here

    const isValidStep = await trigger(fieldsToValidate);
    if (isValidStep) {
      setStep(s => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmitHandler = (data: TripWizardFormData) => {
    // Map TripWizardFormData to the core Trip data structure for onTripCreated
    const tripCoreData: Omit<Trip, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      coverImageUrl: data.coverImageUrl,
      tripType: data.tripType,
      tripStyle: data.tripStyle,
      collaborators: data.collaborators ? data.collaborators.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      // familia field is not in TripWizardFormData, it can be derived or handled separately if needed.
    };
    onTripCreated(tripCoreData);
    onClose();
  };

  const progressPercentage = (step / totalSteps) * 100;

  const renderStepContent = () => {
    switch (step) {
      case 1: // Lo Esencial y Viajeros
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center"><Rocket className="mr-2 h-5 w-5 text-primary" />Paso 1: Lo Esencial y Viajeros</h3>
            <div>
              <Label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">Nombre del Viaje</Label>
              <Controller name="name" control={control} render={({ field }) => <Input id="name" placeholder="Ej: Aventura por el Sudeste Asiático" {...field} />} />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="mb-1 block text-sm font-medium text-foreground">Fecha de Inicio</Label>
                <Controller name="startDate" control={control} render={({ field }) => <Input id="startDate" type="date" {...field} />} />
                {errors.startDate && <p className="text-sm text-destructive mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <Label htmlFor="endDate" className="mb-1 block text-sm font-medium text-foreground">Fecha de Fin</Label>
                <Controller name="endDate" control={control} render={({ field }) => <Input id="endDate" type="date" {...field} />} />
                {errors.endDate && <p className="text-sm text-destructive mt-1">{errors.endDate.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numTravelers" className="mb-1 block text-sm font-medium text-foreground">Total Viajeros</Label>
                <Controller name="numTravelers" control={control} render={({ field }) => <Input id="numTravelers" type="number" placeholder="1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || null)} />} />
                {errors.numTravelers && <p className="text-sm text-destructive mt-1">{errors.numTravelers.message}</p>}
              </div>
              <div>
                <Label htmlFor="numAdults" className="mb-1 block text-sm font-medium text-foreground">Adultos</Label>
                <Controller name="numAdults" control={control} render={({ field }) => <Input id="numAdults" type="number" placeholder="1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || null)} />} />
                {errors.numAdults && <p className="text-sm text-destructive mt-1">{errors.numAdults.message}</p>}
              </div>
              <div>
                <Label htmlFor="numChildren" className="mb-1 block text-sm font-medium text-foreground">Niños</Label>
                <Controller name="numChildren" control={control} render={({ field }) => <Input id="numChildren" type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || null)} />} />
                {errors.numChildren && <p className="text-sm text-destructive mt-1">{errors.numChildren.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="childrenAges" className="mb-1 block text-sm font-medium text-foreground">Edades de los Niños (opcional, sep. por coma)</Label>
              <Controller name="childrenAges" control={control} render={({ field }) => <Input id="childrenAges" placeholder="Ej: 5, 10" {...field} />} />
              {errors.childrenAges && <p className="text-sm text-destructive mt-1">{errors.childrenAges.message}</p>}
            </div>
          </div>
        );
      case 2: // Portada y Contexto
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" />Paso 2: Portada y Contexto</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label className="mb-1 block text-sm font-medium text-foreground">Tipo de Viaje</Label>
                    <Controller name="tripType" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Selecciona tipo" /></SelectTrigger>
                        <SelectContent>{Object.values(TripType).map(type => (<SelectItem key={type} value={type}>{type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>))}</SelectContent>
                        </Select>
                    )} />
                    {errors.tripType && <p className="text-sm text-destructive mt-1">{errors.tripType.message}</p>}
                </div>
                <div>
                    <Label className="mb-1 block text-sm font-medium text-foreground">Estilo de Viaje</Label>
                    <Controller name="tripStyle" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Selecciona estilo" /></SelectTrigger>
                        <SelectContent>{Object.values(TripStyle).map(style => (<SelectItem key={style} value={style}>{style.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>))}</SelectContent>
                        </Select>
                    )} />
                    {errors.tripStyle && <p className="text-sm text-destructive mt-1">{errors.tripStyle.message}</p>}
                </div>
            </div>
             <p className="text-xs text-muted-foreground">Estos datos también ayudarán a la IA a personalizar sugerencias y la foto de portada.</p>

            <div>
              <Label className="mb-1 block text-sm font-medium text-foreground">Foto de Portada</Label>
              <Button type="button" onClick={handleGenerateCoverImage} disabled={isGeneratingCoverImage} className="w-full mb-2">
                {isGeneratingCoverImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isGeneratingCoverImage ? "Generando Imagen..." : "Generar Foto de Portada con IA"}
              </Button>
              {generatedCoverImagePreview && (
                <div className="mt-2 border rounded-md p-2 flex justify-center items-center bg-muted/50">
                  <Image src={generatedCoverImagePreview} alt="Vista previa de portada" width={300} height={200} className="rounded-md object-contain max-h-[200px]" />
                </div>
              )}
              {!generatedCoverImagePreview && !isGeneratingCoverImage && (
                 <div className="mt-2 border border-dashed rounded-md p-4 flex flex-col justify-center items-center bg-muted/30 h-[150px]">
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-2"/>
                    <p className="text-sm text-muted-foreground text-center">La imagen generada aparecerá aquí.</p>
                 </div>
              )}
              {isGeneratingCoverImage && (
                  <div className="mt-2 border border-dashed rounded-md p-4 flex flex-col justify-center items-center bg-muted/30 h-[150px]">
                    <Loader2 className="h-12 w-12 text-primary animate-spin mb-2"/>
                    <p className="text-sm text-muted-foreground text-center">Creando magia visual...</p>
                 </div>
              )}
               <p className="text-xs text-muted-foreground mt-1">La IA usará los detalles del viaje para crear una imagen única.</p>
               {errors.coverImageUrl && <p className="text-sm text-destructive mt-1">{errors.coverImageUrl.message}</p>}
            </div>
          </div>
        );
      case 3: // Colaboradores
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Paso 3: Colaboradores (Opcional)</h3>
            <div>
              <Label htmlFor="collaborators" className="mb-1 block text-sm font-medium text-foreground">Invitar por email (separados por coma)</Label>
              <Controller name="collaborators" control={control} render={({ field }) => <Textarea id="collaborators" placeholder="email1@ejemplo.com, email2@ejemplo.com" {...field} rows={3} />} />
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

        <form onSubmit={handleSubmit(onSubmitHandler)} className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[60vh]">
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
            <Button type="button" onClick={handleSubmit(onSubmitHandler)} disabled={!isFormValid || isGeneratingCoverImage}>
              Crear Viaje <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    