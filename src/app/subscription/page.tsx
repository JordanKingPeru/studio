
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, XCircle, Star, ShieldCheck, Rocket, Users } from 'lucide-react'; // Added Users icon
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface PlanFeature {
  name: string;
  free: string | React.ReactNode;
  pro: string | React.ReactNode;
  icon: React.ElementType;
}

const features: PlanFeature[] = [
  { name: "Número de Viajes", free: "1 Viaje", pro: <span className="font-bold text-primary">Ilimitados</span>, icon: Rocket },
  { name: "Colaboradores por Viaje", free: "Limitado", pro: <span className="font-bold text-primary">Ilimitados</span>, icon: Users },
  { name: "Checklists Inteligentes (IA)", free: <XCircle className="text-destructive" />, pro: <CheckCircle className="text-green-500" />, icon: ShieldCheck },
  { name: "Sugerencias IA Avanzadas", free: "Básicas", pro: <span className="font-bold text-primary">Avanzadas</span>, icon: Star },
  { name: "Soporte", free: "Estándar", pro: <span className="font-bold text-primary">Prioritario</span>, icon: ShieldCheck },
];

export default function SubscriptionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { currentUser } = useAuth();

  const currentPlanIsFree = currentUser?.subscription?.planId === 'free_tier';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold font-headline text-primary">
            Elige tu Plan Perfecto
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Desbloquea todo el potencial de Family Trip Planner y viaja sin límites.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Plan Gratuito */}
          <Card className={`rounded-xl shadow-2xl ${currentPlanIsFree ? 'border-2 border-primary ring-4 ring-primary/20' : 'border-border'}`}>
            <CardHeader className="bg-muted/50 rounded-t-xl p-6">
              <CardTitle className="text-2xl font-bold font-headline text-foreground">Plan Gratuito</CardTitle>
              <CardDescription className="text-muted-foreground">
                Empieza a planificar tu primera aventura.
                {currentPlanIsFree && <span className="block text-xs text-primary font-semibold mt-1">(Tu Plan Actual)</span>}
              </CardDescription>
              <p className="text-4xl font-extrabold text-foreground mt-2">Gratis</p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3">
                    <feature.icon className={`h-5 w-5 ${feature.free === 'Limitado' || typeof feature.free !== 'string' ? 'text-muted-foreground' : 'text-primary'}`} />
                    <span className="text-foreground/80">{feature.name}:</span>
                    <span className="font-medium text-foreground ml-auto text-right">{feature.free}</span>
                  </li>
                ))}
              </ul>
              {currentPlanIsFree ? (
                <Button variant="outline" className="w-full mt-6" disabled>
                  Ya estás en este plan
                </Button>
              ) : (
                 <Button variant="outline" className="w-full mt-6" onClick={() => alert('Funcionalidad para cambiar a gratuito no disponible.')}>
                    Seleccionar Plan Gratuito
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Plan Pro */}
          <Card className="rounded-xl shadow-2xl border-border relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background">
             <div className="absolute top-0 right-0 bg-accent text-accent-foreground text-xs font-bold px-3 py-1.5 rounded-bl-lg shadow-md">
                PRÓXIMAMENTE
            </div>
            <CardHeader className="p-6">
              <CardTitle className="text-2xl font-bold font-headline text-primary">Plan Pro</CardTitle>
              <CardDescription className="text-muted-foreground">
                Para planificadores serios y familias aventureras.
              </CardDescription>
              <p className="mt-2">
                <span className="text-4xl font-extrabold text-primary">€9.99</span>
                <span className="text-muted-foreground text-sm">/mes</span>
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-3">
                    <feature.icon className="h-5 w-5 text-primary" />
                    <span className="text-foreground/80">{feature.name}:</span>
                    <span className="font-medium text-primary ml-auto text-right">{feature.pro}</span>
                  </li>
                ))}
              </ul>
              <Button 
                size="lg" 
                className="w-full mt-6 bg-gradient-to-r from-accent to-primary/80 hover:from-accent/90 hover:to-primary/70 text-white shadow-lg"
                onClick={() => setIsModalOpen(true)}
              >
                <Star className="mr-2 h-5 w-5" />
                Hazte Pro
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
            <Link href="/" className="text-sm text-primary hover:underline">
                Volver a Mis Viajes
            </Link>
        </div>
      </div>

      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Star className="h-5 w-5 mr-2 text-yellow-400" />
              ¡Gracias por tu Interés en el Plan Pro!
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              Los planes de pago estarán disponibles muy pronto. Estamos trabajando para ofrecerte la mejor experiencia.
              Te notificaremos en cuanto puedas actualizar tu plan.
              <br /><br />
              ¡Gracias por ser parte de Family Trip Planner!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsModalOpen(false)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

