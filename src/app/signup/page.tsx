
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
import { signUpWithEmail, signInWithGoogle } from '@/firebase/auth'; // Import auth functions
import { Loader2 } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Email inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const handleSignup: (data: SignupFormData) => Promise<void> = async (data) => {
    setIsLoading(true);
    try {
      await signUpWithEmail(data.name, data.email, data.password);
      toast({ title: '¡Cuenta Creada!', description: 'Te has registrado correctamente. Serás redirigido...' });
      // Firebase onAuthStateChanged will handle redirect via ProtectedRoute and AuthContext
      const intendedPath = localStorage.getItem('intendedPath') || '/';
      localStorage.removeItem('intendedPath');
      router.push(intendedPath);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // This is a common, handled error. The toast is sufficient.
        // console.info("Signup attempt with existing email:", data.email); // Optional: log as info if needed
      } else {
        console.error("Signup error:", error); // Log other unexpected errors
      }
      toast({
        variant: 'destructive',
        title: 'Error al registrarse',
        description: error.code === 'auth/email-already-in-use'
          ? 'Este email ya está registrado. Intenta iniciar sesión.'
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

  return (
    <AuthFormCard
      title="Crear Cuenta"
      description="Únete para empezar a planificar tus aventuras."
      socialLogins={{ onGoogleSignIn: handleGoogleSignIn, isGoogleLoading }}
      footerContent={
        <p>¿Ya tienes una cuenta?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
      }
      isLoading={isLoading}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSignup)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl><Input placeholder="Tu Nombre Completo" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Contraseña</FormLabel>
                <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Cuenta
          </Button>
        </form>
      </Form>
    </AuthFormCard>
  );
}
