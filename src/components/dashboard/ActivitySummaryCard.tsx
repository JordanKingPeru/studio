
"use client";

import type { Activity, ActivityCategory } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Utensils, Building, Plane, Briefcase, Palette, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivitySummaryCardProps {
  activity: Activity;
}

const categoryDetails: Record<ActivityCategory, { icon: React.ElementType; colorClasses: string }> = {
  Viaje: { icon: Plane, colorClasses: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700" },
  Comida: { icon: Utensils, colorClasses: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700" },
  Cultural: { icon: Palette, colorClasses: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700" },
  Ocio: { icon: Sparkles, colorClasses: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700" },
  Trabajo: { icon: Briefcase, colorClasses: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600" },
  Alojamiento: { icon: Building, colorClasses: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700" },
  Otro: { icon: HelpCircle, colorClasses: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-700" },
};

export default function ActivitySummaryCard({ activity }: ActivitySummaryCardProps) {
  const details = categoryDetails[activity.category] || categoryDetails.Otro;
  const IconComponent = details.icon;

  return (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow rounded-lg">
      <CardContent className="p-3 flex items-center space-x-3">
        <div className={`p-2 rounded-full ${details.colorClasses.split(' ')[0]}`}>
          <IconComponent size={20} className={details.colorClasses.split(' ')[1]} />
        </div>
        <div className="flex-grow min-w-0">
          <p className="text-sm font-semibold text-foreground truncate" title={activity.title}>{activity.title}</p>
          <div className="flex items-center text-xs text-muted-foreground mt-0.5">
            <Clock size={12} className="mr-1" />
            <span>{activity.time}</span>
            <Badge variant="outline" className={cn("ml-2 text-xs py-0 px-1.5", details.colorClasses)}>
              {activity.category}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
