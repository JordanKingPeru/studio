
"use client";

import { Button } from '@/components/ui/button';
import { signOutUser } from '@/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import type { ButtonProps } from '@/components/ui/button'; // Import ButtonProps

interface SignOutButtonProps extends Omit<ButtonProps, 'onClick'> { // Omit onClick to define it internally
  // No additional props needed for now
}

export default function SignOutButton({ variant = "ghost", size = "icon", children, ...props }: SignOutButtonProps) {
  const { toast } = useToast();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast({ title: 'Sesión Cerrada', description: 'Has cerrado sesión correctamente.' });
      router.push('/login'); // Redirect to login after sign out
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'No se pudo cerrar sesión.' });
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleSignOut} {...props}>
      {children || <LogOut className="h-5 w-5" />} 
      {children && <span className="sr-only">Cerrar Sesión</span>}
    </Button>
  );
}
