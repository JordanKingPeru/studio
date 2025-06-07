import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
  headerActions?: ReactNode;
}

export default function SectionCard({ id, title, description, icon, className, children, headerActions }: SectionCardProps) {
  return (
    <section id={id} className="scroll-mt-20 md:scroll-mt-24 py-8">
      <Card className={cn("rounded-2xl shadow-xl overflow-hidden bg-card", className)}>
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-3xl font-headline text-primary flex items-center gap-3">
                {icon}
                {title}
              </CardTitle>
              {description && <CardDescription className="mt-1 text-base">{description}</CardDescription>}
            </div>
            {headerActions && <div className="shrink-0">{headerActions}</div>}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 lg:p-8">
          {children}
        </CardContent>
      </Card>
    </section>
  );
}
