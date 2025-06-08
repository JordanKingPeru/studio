
import type { Activity, ActivityCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Tag, Edit2, Trash2, DollarSign, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityCardProps {
  activity: Activity;
  onEdit: (activity: Activity) => void;
  onDelete: (activityId: string) => void;
}

const categoryColors: Record<ActivityCategory, string> = {
  Viaje: "bg-blue-100 text-blue-800 border-blue-300",
  Comida: "bg-orange-100 text-orange-800 border-orange-300",
  Cultural: "bg-purple-100 text-purple-800 border-purple-300",
  Ocio: "bg-green-100 text-green-800 border-green-300",
  Trabajo: "bg-gray-100 text-gray-800 border-gray-300",
  Alojamiento: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Otro: "bg-pink-100 text-pink-800 border-pink-300",
};

export default function ActivityCard({ activity, onEdit, onDelete }: ActivityCardProps) {
  return (
    <Card className="mb-4 shadow-md hover:shadow-lg transition-all duration-200 ease-in-out transform hover:-translate-y-0.5 rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-grow min-w-0 mr-2">
            <CardTitle className="text-xl font-headline text-primary-foreground bg-primary py-2 px-3 rounded-t-md -mt-4 -mx-4 mb-2 truncate w-full">
              {activity.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center"><Clock size={16} className="mr-1.5" /> {activity.time}</span>
              <Badge variant="outline" className={cn("text-xs", categoryColors[activity.category] || categoryColors.Otro)}>
                <Tag size={14} className="mr-1" />{activity.category}
              </Badge>
              {activity.cost && (
                <span className="flex items-center font-semibold text-accent-foreground/80"><DollarSign size={16} className="mr-1 text-accent" /> {activity.cost.toLocaleString()}</span>
              )}
            </div>
          </div>
          <div className="flex space-x-1 sm:space-x-2 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(activity)} aria-label="Edit activity">
              <Edit2 size={18} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(activity.id)} aria-label="Delete activity" className="text-destructive hover:text-destructive/90 hover:bg-destructive/10">
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      </CardHeader>
      {activity.notes && (
        <CardContent>
          <p className="text-sm text-foreground/80 flex items-start"><FileText size={16} className="mr-2 mt-0.5 shrink-0 text-muted-foreground" /> {activity.notes}</p>
        </CardContent>
      )}
    </Card>
  );
}
