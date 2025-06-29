"use client";

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { CreateTripWizardData } from '@/lib/types';
import { TripType, TripStyle, tripTypeTranslations, tripStyleTranslations } from '@/lib/types';
import { ChevronLeft, ChevronRight, ArrowRight, Rocket, Palette, Users, Sparkles, Image as ImageIconLucide, Loader2, Minus, Plus, User, UserRound, Baby, Info, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { generateTripCoverImage, type GenerateTripCoverImageInput } from '@/ai/flows/generate-trip-cover-image';
import { useToast } from "@/hooks/use-toast";
import NextImage from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";


// --- New DateRangePicker Component ---
interface DateRangePickerProps extends React.ComponentProps<'div'> {
  dateRange: DateRange | undefined;
  onDateChange: (dateRange: DateRange | undefined) => void;
  tripStartDate: string;
}

function DateRangePicker({ className, dateRange, onDateChange, tripStartDate }: DateRangePickerProps) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-full justify-start text-left font-normal h-auto p-0',
              !dateRange?.from && 'text-muted-foreground'
            )}
          >
            <div className="flex items-center divide-x divide-border w-full">
              <div className="flex items-center gap-2 px-3 py-2 w-1/2">
                 <CalendarIcon className="h-4 w-4" />
                 {dateRange?.from ? (
                    format(dateRange.from, "d MMM, yyyy", { locale: es })
                 ) : (
                    <span>Fecha de inicio</span>
                 )}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 w-1/2">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange?.to ? (
                    format(dateRange.to, "d MMM, yyyy", { locale: es })
                  ) : (
                    <span>Fecha de fin</span>
                  )}
              </div>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from || parseISO(tripStartDate)}
            selected={dateRange}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={es}
            disabled={{ before: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const childAgeSchema = z.object({
  age: z.number().min(2, "La edad debe ser entre 2 y 11.").max(11, "La edad debe ser entre 2 y 11."),
});

const emailInviteSchema = z.object({
  email: z.string().email({ message: "Email inválido. Por favor, introduce una dirección correcta." }),
});

const tripWizardSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de inicio inválida."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha de fin inválida."),
  numTravelers: z.number().min(1, "Debe haber al menos 1 viajero.").optional().nullable(),
  numAdults: z.number().min(1, "Debe haber al menos 1 adulto.").optional().nullable(),
  numChildren: z.number().min(0, "El número de niños no puede ser negativo.").optional().nullable(),
  numInfants: z.number().min(0, "El número de bebés no puede ser negativo.").optional().nullable(),
  childrenAges: z.string().optional(), // This will be constructed on submit
  childAgesArray: z.array(childAgeSchema).optional(), // This is used by useFieldArray
  coverImageUrl: z.string().optional().or(z.literal('')),
  tripType: z.nativeEnum(TripType),
  tripStyle: z.nativeEnum(TripStyle),
  pendingInvites: z.array(emailInviteSchema).optional(),
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: "La fecha de fin debe ser posterior o igual a la fecha de inicio.",
  path: ["endDate"],
}).refine(data => {
    const adults = data.numAdults ?? 0;
    const children = data.numChildren ?? 0;
    const infants = data.numInfants ?? 0;
    const total = adults + children + infants;
    return total > 0;
}, {
    message: "Debe haber al menos un viajero.",
    path: ["numAdults"],
}).refine(data => (data.numInfants ?? 0) <= (data.numAdults ?? 0), {
    message: "Debe haber al menos un adulto por cada bebé.",
    path: ["numInfants"],
});

type TripWizardFormDataInternal = z.infer<typeof tripWizardSchema>;

interface CreateTripWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (tripData: CreateTripWizardData) => void;
}

const todayDate = new Date().toISOString().split('T')[0];
const oneWeekLaterDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export default function CreateTripWizard({ isOpen, onClose, onTripCreated }: CreateTripWizardProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const { toast } = useToast();
  const [isGeneratingCoverImage, setIsGeneratingCoverImage] = useState(false);
  const [generatedCoverImagePreview, setGeneratedCoverImagePreview] = useState<string | null>(null);

  const form = useForm<TripWizardFormDataInternal>({
    resolver: zodResolver(tripWizardSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      startDate: todayDate,
      endDate: oneWeekLaterDate,
      numAdults: 1,
      numChildren: 0,
      numInfants: 0,
      numTravelers: 1,
      childrenAges: '',
      childAgesArray: [],
      coverImageUrl: '',
      tripType: TripType.LEISURE,
      tripStyle: TripStyle.FAMILY,
      pendingInvites: [],
    }
  });
  
  const { control, handleSubmit, formState: { errors, isValid: isFormValid }, trigger, watch, reset, setValue, getValues } = form;

  const { fields: childAgeFields, append: appendChildAge, remove: removeChildAge } = useFieldArray({
    control,
    name: "childAgesArray",
  });

  const { fields: inviteFields, append: appendInvite, remove: removeInvite } = useFieldArray({
    control,
    name: "pendingInvites",
  });

  const watchedCoverImageUrl = watch('coverImageUrl');
  const numAdults = watch('numAdults') ?? 1;
  const numChildren = watch('numChildren') ?? 0;
  const numInfants = watch('numInfants') ?? 0;
  
  const startDateValue = watch('startDate');
  const endDateValue = watch('endDate');

  useEffect(() => {
    const currentCount = childAgeFields.length;
    const targetCount = numChildren;

    if (currentCount < targetCount) {
      for (let i = currentCount; i < targetCount; i++) {
        appendChildAge({ age: 2 }); // Default age to 2 years for new child
      }
    } else if (currentCount > targetCount) {
      for (let i = currentCount; i > targetCount; i--) {
        removeChildAge(i - 1);
      }
    }
  }, [numChildren, childAgeFields.length, appendChildAge, removeChildAge]);


  const dateRangeForPicker: DateRange | undefined = useMemo(() => {
      try {
          const from = startDateValue ? parseISO(startDateValue) : undefined;
          const to = endDateValue ? parseISO(endDateValue) : undefined;
          if (from && isNaN(from.getTime())) throw new Error("Invalid start date");
          if (to && isNaN(to.getTime())) throw new Error("Invalid end date");
          return { from, to };
      } catch(e) {
          console.error("Error parsing date range for picker:", e);
          return { from: undefined, to: undefined };
      }
  }, [startDateValue, endDateValue]);


  useEffect(() => {
     setValue('numTravelers', (numAdults) + (numChildren) + (numInfants));
  }, [numAdults, numChildren, numInfants, setValue]);

  useEffect(() => {
    if (isOpen) {
        reset({
            name: '',
            startDate: todayDate,
            endDate: oneWeekLaterDate,
            numAdults: 1,
            numChildren: 0,
            numInfants: 0,
            numTravelers: 1,
            childrenAges: '',
            childAgesArray: [],
            coverImageUrl: '',
            tripType: TripType.LEISURE,
            tripStyle: TripStyle.FAMILY,
            pendingInvites: [],
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
    const { name, startDate, endDate, tripType, tripStyle, numTravelers, numAdults, numChildren, numInfants, childAgesArray } = currentValues;
    const childrenAges = childAgesArray?.map(c => c.age).join(', ') ?? '';

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
      numInfants: numInfants ?? 0,
      childrenAges: childrenAges,
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
    if (step === 1) fieldsToValidate = ['name', 'startDate', 'endDate', 'numAdults', 'numChildren', 'numInfants', 'childAgesArray'];
    if (step === 2) fieldsToValidate = ['tripType', 'tripStyle', 'coverImageUrl'];

    const isValidStep = await trigger(fieldsToValidate);
    if (isValidStep) {
      setStep(s => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const onSubmitHandler = (data: TripWizardFormDataInternal) => {
    const parsedPendingInvites = data.pendingInvites?.map(invite => invite.email).filter(Boolean) || [];
    const agesString = data.childAgesArray?.map(item => item.age).join(', ') ?? '';

    const tripCoreData: CreateTripWizardData = {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      coverImageUrl: data.coverImageUrl,
      tripType: data.tripType,
      tripStyle: data.tripStyle,
      pendingInvites: parsedPendingInvites,
      numTravelers: data.numTravelers ?? undefined,
      numAdults: data.numAdults ?? undefined,
      numChildren: data.numChildren ?? undefined,
      numInfants: data.numInfants ?? undefined,
      childrenAges: agesString,
    };
    onTripCreated(tripCoreData);
    onClose();
  };

  const progressPercentage = (step / totalSteps) * 100;

  const travelerSummary = () => {
    const parts = [];
    if (numAdults > 0) parts.push(`${numAdults} adulto${numAdults > 1 ? 's' : ''}`);
    if (numChildren > 0) parts.push(`${numChildren} niño${numChildren > 1 ? 's' : ''}`);
    if (numInfants > 0) parts.push(`${numInfants} bebé${numInfants > 1 ? 's' : ''}`);
    return parts.join(', ') || "Seleccionar viajeros";
  }

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
            
            <div className="space-y-1">
                <Label className="text-sm font-medium text-foreground">Fechas del Viaje</Label>
                <DateRangePicker
                    dateRange={dateRangeForPicker}
                    onDateChange={(newRange) => {
                        setValue('startDate', newRange?.from ? format(newRange.from, 'yyyy-MM-dd') : '', { shouldValidate: true });
                        setValue('endDate', newRange?.to ? format(newRange.to, 'yyyy-MM-dd') : '', { shouldValidate: true });
                    }}
                    tripStartDate={todayDate}
                />
                {(errors.startDate || errors.endDate) && (
                    <p className="text-sm text-destructive mt-1">
                        {errors.startDate?.message || errors.endDate?.message}
                    </p>
                )}
            </div>

            <div>
              <Label>Viajeros</Label>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {travelerSummary()}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="start">
                      <div className="p-4 space-y-4">
                           {/* Adults */}
                           <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <User className="h-5 w-5 text-muted-foreground"/>
                                    <div>
                                        <p className="font-medium">Adultos</p>
                                        <p className="text-xs text-muted-foreground">12 o más años</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setValue('numAdults', Math.max(1, numAdults - 1))} disabled={numAdults <= 1}>
                                        <Minus className="h-4 w-4"/>
                                    </Button>
                                    <span className="w-8 text-center font-bold">{numAdults}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setValue('numAdults', numAdults + 1)}>
                                        <Plus className="h-4 w-4"/>
                                    </Button>
                                </div>
                           </div>

                           <Separator/>

                           {/* Children */}
                           <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <UserRound className="h-5 w-5 text-muted-foreground"/>
                                    <div>
                                        <p className="font-medium">Niños</p>
                                        <p className="text-xs text-muted-foreground">De 2 a 11 años</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setValue('numChildren', Math.max(0, numChildren - 1), { shouldValidate: true })} disabled={numChildren <= 0}>
                                        <Minus className="h-4 w-4"/>
                                    </Button>
                                    <span className="w-8 text-center font-bold">{numChildren}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setValue('numChildren', numChildren + 1, { shouldValidate: true })}>
                                        <Plus className="h-4 w-4"/>
                                    </Button>
                                </div>
                           </div>
                           
                            {childAgeFields.length > 0 && <Separator />}
                            <div className="space-y-3 pl-4">
                              {childAgeFields.map((field, index) => (
                                <div key={field.id} className="flex items-center justify-between">
                                  <Label htmlFor={`child-age-${index}`} className="text-sm text-muted-foreground">{`Edad del niño ${index + 1}`}</Label>
                                  <Controller
                                    control={control}
                                    name={`childAgesArray.${index}.age`}
                                    render={({ field: controllerField }) => (
                                      <Select onValueChange={(value) => controllerField.onChange(parseInt(value, 10))} value={String(controllerField.value)}>
                                        <SelectTrigger id={`child-age-${index}`} className="w-[80px]">
                                          <SelectValue placeholder="Edad" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {Array.from({ length: 10 }, (_, i) => i + 2).map(age => (
                                            <SelectItem key={age} value={String(age)}>{age}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
                                </div>
                              ))}
                            </div>

                           <Separator/>

                            {/* Infants */}
                           <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Baby className="h-5 w-5 text-muted-foreground"/>
                                    <div>
                                        <p className="font-medium">Bebés</p>
                                        <p className="text-xs text-muted-foreground">Menores de 2 años</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setValue('numInfants', Math.max(0, numInfants - 1))} disabled={numInfants <= 0}>
                                        <Minus className="h-4 w-4"/>
                                    </Button>
                                    <span className="w-8 text-center font-bold">{numInfants}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setValue('numInfants', numInfants + 1)} disabled={numInfants >= numAdults}>
                                        <Plus className="h-4 w-4"/>
                                    </Button>
                                </div>
                           </div>
                      </div>
                      {errors.numInfants?.message && (
                        <Alert variant="destructive" className="m-4 mt-0 rounded-md border-red-500/50 text-red-900 dark:text-red-200 [&>svg]:text-red-500 dark:[&>svg]:text-red-300">
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {errors.numInfants.message}
                          </AlertDescription>
                        </Alert>
                      )}
                  </PopoverContent>
              </Popover>
              {(errors.numAdults || errors.numChildren || errors.numTravelers) && (
                <p className="text-sm text-destructive mt-1">
                    {errors.numAdults?.message || errors.numChildren?.message || errors.numTravelers?.message}
                </p>
              )}
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
              <Label className="mb-2 block text-sm font-medium text-foreground">Invitar por email</Label>
              <div className="space-y-3">
                {inviteFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 animate-fadeInEnter">
                    <FormField
                      control={control}
                      name={`pendingInvites.${index}.email`}
                      render={({ field: formField }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input placeholder="email@ejemplo.com" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInvite(index)}
                      className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10"
                      aria-label="Eliminar email"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendInvite({ email: "" })}
                className="mt-3"
              >
                <Plus className="mr-2 h-4 w-4" />
                Añadir otro email
              </Button>
              <p className="text-xs text-muted-foreground mt-2">Los usuarios invitados podrán ver y editar este viaje una vez que acepten la invitación.</p>
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

        <div className="px-6 pb-6 space-y-6 overflow-y-auto max-h-[60vh]">
          <Form {...form}>
            {renderStepContent()}
          </Form>
        </div>

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
