
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
import type { CreateTripWizardData } from '@/lib/types'; // Usar el nuevo tipo para el formulario
import { TripType, TripStyle, tripTypeTranslations, tripStyleTranslations } from '@/lib/types';
import { ChevronLeft, ChevronRight, ArrowRight, Rocket, Palette, Users, Sparkles, Image as ImageIconLucide, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateTripCoverImage, type GenerateTripCoverImageInput } from '@/ai/flows/generate-trip-cover-image';
import { useToast } from "@/hooks/use-toast";
import NextImage from 'next/image'; // Renombrado para evitar conflicto con IconLucide
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const tripWizardSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio inválida."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de fin inválida."),
  numTravelers: z.number().min(1, "Debe haber al menos 1 viajero.").optional().nullable(),
  numAdults: z.number().min(0, "Número de adultos no puede ser negativo.").optional().nullable(),
  numChildren: z.number().min(0, "Número de niños no puede ser negativo.").optional().nullable(),
  childrenAges: z.string().optional(),
  coverImageUrl: z.string().optional().or(z.literal('')),
  tripType: z.nativeEnum(TripType),
  tripStyle: z.nativeEnum(TripStyle),
  pendingInvites: z.string().optional(), // String para emails separados por coma
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

type TripWizardFormDataInternal = z.infer<typeof tripWizardSchema>;

interface CreateTripWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (tripData: CreateTripWizardData) => void; // Usar el tipo específico para el wizard
}

const todayDate = new Date().toISOString().split('T')[0];
const oneWeekLaterDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export default function CreateTripWizard({ isOpen, onClose, onTripCreated }: CreateTripWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const { toast } = useToast();
  const [isGeneratingCoverImage, setIsGeneratingCoverImage] = useState(false);
  const [generatedCoverImagePreview, setGeneratedCoverImagePreview] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isValid: isFormValid }, trigger, watch, reset, setValue, getValues } = useForm<TripWizardFormDataInternal>({
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
      pendingInvites: '',
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
            pendingInvites: '',
        });
        setStep(1);
        setGeneratedCoverImagePreview(null);
        setIsGeneratingCoverImage(false);
    }
  }, [isOpen, reset]);

  useEffect(() => {
    setGeneratedCoverImagePreview(watchedCoverImageUrl || null);
  }, [watchedCoverImageUrl]);


  const handleGenerateCoverImage = async () => {
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
    let fieldsToValidate: (keyof TripWizardFormDataInternal)[] = [];
    if (step === 1) fieldsToValidate = ['name', 'startDate', 'endDate', 'numTravelers', 'numAdults', 'numChildren', 'childrenAges'];
    if (step === 2) fieldsToValidate = ['tripType', 'tripStyle', 'coverImageUrl'];

    const isValidStep = await trigger(fieldsToValidate);
    if (isValidStep) {
      setStep(s => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmitHandler = (data: TripWizardFormDataInternal) => {
    const parsedPendingInvites = data.pendingInvites ? data.pendingInvites.split(',').map(s => s.trim()).filter(Boolean) : [];
    const tripCoreData: CreateTripWizardData = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      coverImageUrl: data.coverImageUrl,
      tripType: data.tripType,
      tripStyle: data.tripStyle,
      pendingInvites: parsedPendingInvites, // Array de emails
      numTravelers: data.numTravelers ?? undefined,
      numAdults: data.numAdults ?? undefined,
      numChildren: data.numChildren ?? undefined,
      childrenAges: data.childrenAges ?? undefined,
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
                <Controller
                  name="numTravelers"
                  control={control}
                  render={({ field: { onChange, onBlur, value, name, ref } }) => (
                    <Input
                      id="numTravelers"
                      type="number"
                      placeholder="1"
                      ref={ref}
                      name={name}
                      value={value ?? ''}
                      onChange={e => {
                        const rawValue = e.target.value;
                        if (rawValue === '') {
                          onChange(null);
                        } else {
                          const num = parseInt(rawValue, 10);
                          onChange(isNaN(num) ? null : num);
                        }
                      }}
                      onBlur={onBlur}
                    />
                  )}
                />
                {errors.numTravelers && <p className="text-sm text-destructive mt-1">{errors.numTravelers.message}</p>}
              </div>
              <div>
                <Label htmlFor="numAdults" className="mb-1 block text-sm font-medium text-foreground">Adultos</Label>
                 <Controller
                  name="numAdults"
                  control={control}
                  render={({ field: { onChange, onBlur, value, name, ref } }) => (
                    <Input
                      id="numAdults"
                      type="number"
                      placeholder="1"
                      ref={ref}
                      name={name}
                      value={value ?? ''}
                      onChange={e => {
                        const rawValue = e.target.value;
                        if (rawValue === '') {
                          onChange(null);
                        } else {
                          const num = parseInt(rawValue, 10);
                          onChange(isNaN(num) ? null : num);
                        }
                      }}
                      onBlur={onBlur}
                    />
                  )}
                />
                {errors.numAdults && <p className="text-sm text-destructive mt-1">{errors.numAdults.message}</p>}
              </div>
              <div>
                <Label htmlFor="numChildren" className="mb-1 block text-sm font-medium text-foreground">Niños</Label>
                <Controller
                  name="numChildren"
                  control={control}
                  render={({ field: { onChange, onBlur, value, name, ref } }) => (
                    <Input
                      id="numChildren"
                      type="number"
                      placeholder="0"
                      ref={ref}
                      name={name}
                      value={value ?? ''}
                      onChange={e => {
                        const rawValue = e.target.value;
                        if (rawValue === '') {
                          onChange(null);
                        } else {
                          const num = parseInt(rawValue, 10);
                          onChange(isNaN(num) ? null : num);
                        }
                      }}
                      onBlur={onBlur}
                    />
                  )}
                />
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
                        <SelectContent>
                          {Object.values(TripType).map(type => (
                            <TooltipProvider key={type} delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SelectItem value={type}>
                                    {tripTypeTranslations[type].label}
                                  </SelectItem>
                                </TooltipTrigger>
                                <TooltipContent side="right" align="start" className="max-w-xs z-[9999]">
                                  <p className="text-xs">{tripTypeTranslations[type].example}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </SelectContent>
                        </Select>
                    )} />
                    {errors.tripType && <p className="text-sm text-destructive mt-1">{errors.tripType.message}</p>}
                </div>
                <div>
                    <Label className="mb-1 block text-sm font-medium text-foreground">Estilo de Viaje</Label>
                    <Controller name="tripStyle" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Selecciona estilo" /></SelectTrigger>
                        <SelectContent>
                          {Object.values(TripStyle).map(style => (
                             <TooltipProvider key={style} delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SelectItem value={style}>
                                    {tripStyleTranslations[style].label}
                                  </SelectItem>
                                </TooltipTrigger>
                                <TooltipContent side="right" align="start" className="max-w-xs z-[9999]">
                                  <p className="text-xs">{tripStyleTranslations[style].example}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </SelectContent>
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
                  <NextImage src={generatedCoverImagePreview} alt="Vista previa de portada" width={300} height={200} className="rounded-md object-contain max-h-[200px]" />
                </div>
              )}
              {!generatedCoverImagePreview && !isGeneratingCoverImage && (
                 <div className="mt-2 border border-dashed rounded-md p-4 flex flex-col justify-center items-center bg-muted/30 h-[150px]">
                    <ImageIconLucide className="h-12 w-12 text-muted-foreground mb-2"/>
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
            <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Paso 3: Invitar Colaboradores (Opcional)</h3>
            <div>
              <Label htmlFor="pendingInvites" className="mb-1 block text-sm font-medium text-foreground">Invitar por email (separados por coma)</Label>
              <Controller name="pendingInvites" control={control} render={({ field }) => <Textarea id="pendingInvites" placeholder="email1@ejemplo.com, email2@ejemplo.com" {...field} rows={3} />} />
              {errors.pendingInvites && <p className="text-sm text-destructive mt-1">{errors.pendingInvites.message}</p>}
              <p className="text-xs text-muted-foreground mt-1">Los usuarios invitados podrán ver y editar este viaje una vez que acepten la invitación.</p>
            </div>
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
