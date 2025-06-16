
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import AuthFormCard from '@/components/auth/AuthFormCard';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmail, signInWithGoogle, sendPasswordReset } from '@/firebase/auth';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const loginSchema = z.object({
  email: z.string().email("Email inválido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);


  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin: (data: LoginFormData) => Promise<void> = async (data) => {
    setIsLoading(true);
    try {
      await signInWithEmail(data.email, data.password);
      toast({ title: '¡Bienvenido/a de nuevo!', description: 'Has iniciado sesión correctamente.' });
      const intendedPath = localStorage.getItem('intendedPath') || '/';
      localStorage.removeItem('intendedPath');
      router.push(intendedPath);
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: error.message === "Firebase: Error (auth/invalid-credential)." 
          ? "Credenciales inválidas. Por favor, revisa tu email y contraseña."
          : error.message || 'Ocurrió un error desconocido.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast({ title: '¡Bienvenido/a!', description: 'Has iniciado sesión con Google correctamente.' });
      const intendedPath = localStorage.getItem('intendedPath') || '/';
      localStorage.removeItem('intendedPath');
      router.push(intendedPath);
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      toast({
        variant: 'destructive',
        title: 'Error con Google',
        description: error.message || 'No se pudo iniciar sesión con Google.',
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!resetEmail) {
        toast({ variant: "destructive", title: "Error", description: "Por favor, ingresa tu email." });
        return;
    }
    setIsResettingPassword(true);
    try {
        await sendPasswordReset(resetEmail);
        toast({ title: "Correo Enviado", description: "Si existe una cuenta, se ha enviado un enlace para restablecer tu contraseña." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message || "No se pudo enviar el correo."});
    } finally {
        setIsResettingPassword(false);
        // Consider closing dialog here if needed, depends on AlertDialog setup
    }
  };


  return (
    <AuthFormCard
      title="Iniciar Sesión"
      description="Accede a tu cuenta para planificar tus viajes."
      socialLogins={{ onGoogleSignIn: handleGoogleSignIn, isGoogleLoading }}
      footerContent={
        <p>¿No tienes una cuenta?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Regístrate aquí
          </Link>
        </p>
      }
      isLoading={isLoading}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleLogin)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="tu@email.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="text-right text-sm">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="link" type="button" className="p-0 h-auto text-primary hover:underline">
                        ¿Olvidaste tu contraseña?
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Restablecer Contraseña</AlertDialogTitle>
                    <AlertDialogDescription>
                        Ingresa tu dirección de email y te enviaremos un enlace para restablecer tu contraseña.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Input 
                        type="email" 
                        placeholder="tu@email.com" 
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="my-2"
                    />
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isResettingPassword}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordReset} disabled={isResettingPassword || !resetEmail}>
                        {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enviar Enlace
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar Sesión
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
