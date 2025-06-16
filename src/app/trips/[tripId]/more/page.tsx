
"use client";

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ListChecks, FileText, MoreHorizontal, CheckSquare, Briefcase, Plane } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  category: string;
}

const initialChecklistCategories: Record<string, string[]> = {
  "Documentos 📄": ["Pasaportes", "Visas (si aplica)", "Billetes de avión/tren", "Reservas de hotel", "Seguro de viaje"],
  "Ropa 👕": ["Ropa interior", "Calcetines", "Pantalones/Faldas", "Camisetas/Blusas", "Jersey/Sudadera", "Chaqueta ligera", "Pijama"],
  "Electrónicos 📱": ["Teléfono móvil y cargador", "Adaptador universal", "Auriculares", "Cámara y cargador (opcional)"],
  "Aseo Personal 🧴": ["Cepillo y pasta de dientes", "Champú y acondicionador", "Gel de ducha", "Desodorante", "Protector solar"],
  "Salud y Botiquín 🩹": ["Medicamentos personales", "Analgésicos (ibuprofeno/paracetamol)", "Tiritas", "Desinfectante de manos"],
};


export default function TripMorePage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Otros');

  const generateDefaultChecklist = () => {
    const defaultItems: ChecklistItem[] = [];
    Object.entries(initialChecklistCategories).forEach(([category, items]) => {
      items.forEach((item, index) => {
        defaultItems.push({ id: `${category.replace(/\s+/g, '-')}-${index}`, label: item, checked: false, category });
      });
    });
    setChecklistItems(defaultItems);
    // In a real app, save to localStorage or backend for this tripId
  };

  useEffect(() => {
    // Simulate loading checklist for this tripId (or generating default if none)
    // For now, we'll just generate a default one if the list is empty
    // In a real app, you'd fetch based on tripId
    if (checklistItems.length === 0) {
        // Try to load from localStorage first
        const storedChecklist = localStorage.getItem(`checklist-${tripId}`);
        if (storedChecklist) {
            setChecklistItems(JSON.parse(storedChecklist));
        } else {
            generateDefaultChecklist(); // Or leave empty and let user generate
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]); // Only run when tripId changes or on initial load

  useEffect(() => {
    // Save to localStorage whenever checklistItems changes
    if (checklistItems.length > 0) { // Only save if there's something to save
        localStorage.setItem(`checklist-${tripId}`, JSON.stringify(checklistItems));
    }
  }, [checklistItems, tripId]);


  const handleToggleItem = (id: string) => {
    setChecklistItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleAddItem = () => {
    if (newItemLabel.trim() === '') return;
    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      label: newItemLabel.trim(),
      checked: false,
      category: newItemCategory.trim() || 'Otros',
    };
    setChecklistItems(prevItems => [...prevItems, newItem]);
    setNewItemLabel('');
  };

  const handleDeleteItem = (id: string) => {
    setChecklistItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const groupedChecklistItems = checklistItems.reduce((acc, item) => {
    (acc[item.category] = acc[item.category] || []).push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);


  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="rounded-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary flex items-center gap-3">
            <MoreHorizontal className="h-8 w-8" />
            Más Opciones y Herramientas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Checklist Inteligente Section */}
          <Card className="rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary flex items-center">
                <ListChecks size={22} className="mr-2" />
                Checklist de Viaje
              </CardTitle>
              <CardContent className="text-xs text-muted-foreground p-0 pt-1">
                Organiza lo que necesitas llevar. ¡En el futuro, la IA podrá generar una lista personalizada para tu tipo de viaje!
                {checklistItems.length === 0 && (
                     <Button onClick={generateDefaultChecklist} size="sm" className="mt-2">Generar Checklist de Ejemplo</Button>
                )}
              </CardContent>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(groupedChecklistItems).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-md font-semibold text-secondary-foreground mb-2 border-b pb-1">{category}</h4>
                  <ul className="space-y-2">
                    {items.map(item => (
                      <li key={item.id} className="flex items-center justify-between group">
                        <div className="flex items-center">
                          <Checkbox
                            id={item.id}
                            checked={item.checked}
                            onCheckedChange={() => handleToggleItem(item.id)}
                            className="mr-3 h-5 w-5"
                          />
                          <Label htmlFor={item.id} className={`text-sm ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {item.label}
                          </Label>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                           <Trash2 size={14} />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="mt-6 pt-4 border-t space-y-2">
                <Label htmlFor="new-checklist-item" className="text-sm font-medium">Añadir nuevo ítem</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input 
                    id="new-checklist-item" 
                    value={newItemLabel} 
                    onChange={(e) => setNewItemLabel(e.target.value)} 
                    placeholder="Nuevo ítem" 
                    className="flex-grow"
                  />
                  <Input 
                    value={newItemCategory} 
                    onChange={(e) => setNewItemCategory(e.target.value)} 
                    placeholder="Categoría (ej: Otros)" 
                    className="sm:w-1/3"
                  />
                  <Button onClick={handleAddItem} size="sm" className="w-full sm:w-auto">Añadir</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Placeholder for Future Features */}
          <div className="p-6 bg-muted/30 rounded-xl shadow-inner">
            <h3 className="text-xl font-headline text-secondary-foreground mb-4 flex items-center">
              <Lightbulb size={22} className="mr-2 text-yellow-500" />
              Próximamente
            </h3>
            <ul className="space-y-3 list-disc list-inside text-foreground/80">
              <li>
                <strong className="font-semibold text-foreground">Gestión de Documentos:</strong> 
                Sube y organiza pasaportes, visas, reservas de hotel/vuelo.
                 <div className="ml-5 mt-1 p-2 bg-background/50 rounded-md text-sm">
                    <FileText size={16} className="inline mr-1.5 text-blue-500" />
                    Acceso rápido y seguro a tus documentos importantes.
                </div>
              </li>
               <li>
                <strong className="font-semibold text-foreground">Resumen del Viaje Post-Viaje:</strong> 
                Un carrusel de fotos con estadísticas compartibles.
              </li>
            </ul>
          </div>

          <p className="text-sm text-center text-muted-foreground pt-4">
            ID del Viaje Actual: {tripId}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
