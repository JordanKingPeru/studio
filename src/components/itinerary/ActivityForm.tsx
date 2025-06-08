
"use client";

import React, { useState, useEffect } from 'react';
import type { Activity, ActivityCategory, City, ActivityAttachment } from '@/lib/types';
import { activityCategories } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, DollarSign, Edit3, TagIcon, TextIcon, ClockIcon, MapPinIcon, Paperclip, UploadCloud, Trash2, FileText, Loader2 } from 'lucide-react';
import { storage } from '@/lib/firebase'; // Import Firebase storage instance
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";

const activityAttachmentSchema = z.object({
  fileName: z.string(),
  downloadURL: z.string().url(),
  uploadedAt: z.string().datetime(),
  fileType: z.string(),
});

const activitySchema = z.object({
  id: z.string().optional(), // Will be set on creation
  title: z.string().min(1, "El título es obligatorio"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)"),
  category: z.custom<ActivityCategory>((val) => activityCategories.includes(val as ActivityCategory), "Categoría inválida"),
  city: z.string().min(1, "La ciudad es obligatoria"),
  notes: z.string().optional(),
  cost: z.number().optional().nullable(), // Allow null as well for easier handling with parseFloat
  order: z.number().optional(),
  attachments: z.array(activityAttachmentSchema).optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface ActivityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Activity) => void;
  cities: City[];
  initialData?: Activity | null;
}

export default function ActivityForm({ isOpen, onClose, onSubmit, cities, initialData }: ActivityFormProps) {
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();
  
  const formActivityId = React.useMemo(() => initialData?.id || `temp-${Date.now().toString()}`, [initialData?.id]);


  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: initialData ? {
      ...initialData,
      id: initialData.id,
      cost: initialData.cost ?? undefined,
      order: initialData.order ?? Date.now(),
      attachments: initialData.attachments || [],
    } : {
      id: formActivityId,
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().substring(0,5),
      category: 'Ocio',
      city: cities[0]?.name || '',
      notes: '',
      cost: undefined,
      order: Date.now(),
      attachments: [],
    },
  });

  useEffect(() => {
    const newActivityId = initialData?.id || `temp-${Date.now().toString()}`;
    if (initialData) {
      form.reset({
        ...initialData,
        id: initialData.id,
        cost: initialData.cost ?? undefined,
        order: initialData.order ?? Date.now(),
        attachments: initialData.attachments || [],
      });
    } else {
       form.reset({
        id: newActivityId,
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().substring(0,5),
        category: 'Ocio',
        city: cities[0]?.name || '',
        notes: '',
        cost: undefined,
        order: Date.now(),
        attachments: [],
      });
    }
  }, [initialData, form, cities]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(file);
    setUploadProgress(0);
    setUploadError(null);

    const activityIdForPath = form.getValues('id') || formActivityId; 

    if (!activityIdForPath) {
        setUploadError("No se pudo determinar el ID de la actividad para la subida.");
        setUploadingFile(null);
        return;
    }
    
    const filePath = `trips/defaultTrip/attachments/${activityIdForPath}/${file.name}`;
    const fileStorageRef = storageRef(storage, filePath);

    try {
      const uploadTask = uploadBytesResumable(fileStorageRef, file);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload failed:", error);
          setUploadError(`Error al subir: ${error.message}`);
          setUploadingFile(null);
          setUploadProgress(null);
          toast({ variant: "destructive", title: "Error de Subida", description: error.message });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const newAttachment: ActivityAttachment = {
            fileName: file.name,
            downloadURL,
            uploadedAt: new Date().toISOString(),
            fileType: file.type,
          };
          const currentAttachments = form.getValues('attachments') || [];
          form.setValue('attachments', [...currentAttachments, newAttachment]);
          setUploadingFile(null);
          setUploadProgress(null);
          toast({ title: "Archivo Subido", description: `${file.name} se ha subido correctamente.` });
        }
      );
    } catch (error: any) {
        console.error("Error starting upload:", error);
        setUploadError(`Error al iniciar subida: ${error.message}`);
        setUploadingFile(null);
        setUploadProgress(null);
        toast({ variant: "destructive", title: "Error de Subida", description: error.message });
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    const currentAttachments = form.getValues('attachments') || [];
    const attachmentToRemove = currentAttachments[indexToRemove];
    
    form.setValue('attachments', currentAttachments.filter((_, index) => index !== indexToRemove));
    toast({ title: "Adjunto Eliminado", description: `${attachmentToRemove.fileName} ha sido quitado de la lista.` });
  };

  const handleSubmit = (data: ActivityFormData) => {
    const finalActivityId = data.id && data.id.startsWith('temp-') ? (initialData?.id || Date.now().toString()) : (data.id || Date.now().toString());
    
    onSubmit({
      ...data,
      id: finalActivityId,
      cost: data.cost ? Number(data.cost) : undefined,
      order: data.order ?? Date.now(),
      attachments: data.attachments || [],
    });
    onCloseAndReset();
  };

  const onCloseAndReset = () => {
    setUploadingFile(null);
    setUploadProgress(null);
    setUploadError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCloseAndReset()}>
      <DialogContent className="sm:max-w-[525px] rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <Edit3 className="mr-2" />
            {initialData ? 'Editar Actividad' : 'Añadir Nueva Actividad'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><TextIcon className="mr-2 h-4 w-4 text-muted-foreground" />Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Visita al Museo del Prado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><ClockIcon className="mr-2 h-4 w-4 text-muted-foreground" />Hora</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><TagIcon className="mr-2 h-4 w-4 text-muted-foreground" />Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activityCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><MapPinIcon className="mr-2 h-4 w-4 text-muted-foreground" />Ciudad</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una ciudad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city.name} value={city.name}>{city.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />Coste (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej: 25"
                      {...field} // Spread field to pass name, ref, onBlur
                      value={field.value ?? ''} // Ensure value is never undefined, default to empty string
                      onChange={e => {
                        const value = e.target.value;
                        // If input is empty string, treat as undefined for react-hook-form
                        // Otherwise, parse as float. parseFloat will return NaN for invalid numbers.
                        field.onChange(value === '' ? undefined : parseFloat(value));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><TextIcon className="mr-2 h-4 w-4 text-muted-foreground" />Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Añade detalles adicionales aquí..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachments Section */}
            <div className="space-y-3">
              <FormLabel className="flex items-center"><Paperclip className="mr-2 h-4 w-4 text-muted-foreground" />Adjuntos</FormLabel>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('file-upload-input')?.click()} disabled={!!uploadingFile}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {uploadingFile ? 'Subiendo...' : 'Seleccionar Archivo'}
                </Button>
                <Input 
                    id="file-upload-input"
                    type="file" 
                    className="hidden" 
                    onChange={handleFileSelect}
                    disabled={!!uploadingFile}
                />
              </div>

              {uploadingFile && uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate max-w-[200px]">{uploadingFile.name}</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

              {(form.watch('attachments')?.length || 0) > 0 && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">Archivos adjuntos:</p>
                  <ul className="list-none space-y-1">
                    {form.watch('attachments')?.map((att, index) => (
                      <li key={index} className="flex items-center justify-between p-1.5 bg-muted/50 rounded-md text-sm">
                        <a href={att.downloadURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline truncate">
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate" title={att.fileName}>{att.fileName}</span>
                        </a>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={() => handleRemoveAttachment(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onCloseAndReset}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" variant="default" disabled={!!uploadingFile}>
                {uploadingFile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? 'Guardar Cambios' : 'Añadir Actividad'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

