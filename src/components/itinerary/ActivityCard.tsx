
import type { Activity, ActivityCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Tag, Edit2, Trash2, DollarSign, FileText, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActivityCardProps {
  activity: Activity;
  onEdit: (activity: Activity) => void;
  onDelete: (activityId: string) => void;
}

const categoryColors: Record<ActivityCategory, string> = {
  Viaje: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
  Comida: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700",
  Cultural: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700",
  Ocio: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
  Trabajo: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600",
  Alojamiento: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700",
  Otro: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-700",
};

export default function ActivityCard({ activity, onEdit, onDelete }: ActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined, // Elevate while dragging
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4 touch-none">
      <Card className={cn(
        "shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 rounded-xl",
        isDragging ? "shadow-2xl ring-2 ring-primary" : ""
      )}>
        <CardHeader className="pb-3 pt-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center flex-grow min-w-0 mr-2">
              <button
                {...attributes}
                {...listeners}
                className="p-2 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-primary mr-1"
                aria-label="Arrastrar actividad para reordenar"
              >
                <GripVertical size={20} />
              </button>
              <div className='flex-grow min-w-0'>
                <CardTitle className="text-lg font-headline text-primary-foreground bg-primary py-1.5 px-3 rounded-t-md -mt-1 -mx-3 mb-1.5 truncate w-full">
                  {activity.title}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center"><Clock size={15} className="mr-1" /> {activity.time}</span>
                  <Badge variant="outline" className={cn("text-xs font-medium py-0.5 px-1.5", categoryColors[activity.category] || categoryColors.Otro)}>
                    <Tag size={13} className="mr-1" />{activity.category}
                  </Badge>
                  {activity.cost != null && ( // Check for null or undefined specifically
                    <span className="flex items-center font-semibold">
                      <DollarSign size={15} className="mr-0.5 text-accent" />
                      <span className="text-accent">{activity.cost.toLocaleString()}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-0 sm:space-x-1 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => onEdit(activity)} aria-label="Editar actividad" className="h-8 w-8 sm:h-9 sm:w-9">
                <Edit2 size={16} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(activity.id)} aria-label="Eliminar actividad" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8 w-8 sm:h-9 sm:w-9">
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </CardHeader>
        {activity.notes && (
          <CardContent className="pt-0 pb-3">
            <p className="text-sm text-foreground/80 flex items-start">
              <FileText size={15} className="mr-1.5 mt-0.5 shrink-0 text-muted-foreground" /> 
              {activity.notes}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
