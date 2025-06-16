
"use client";

import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Briefcase, Chrome } from 'lucide-react'; // Assuming Chrome icon for Google
import Link from 'next/link';

interface AuthFormCardProps {
  title: string;
  description: string;
  children: ReactNode; // Form fields
  socialLogins?: {
    onGoogleSignIn: () => Promise<void>;
    isGoogleLoading?: boolean;
  };
  footerContent?: ReactNode;
  isLoading?: boolean;
}

export default function AuthFormCard({
  title,
  description,
  children,
  socialLogins,
  footerContent,
  isLoading
}: AuthFormCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Briefcase className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {children}
          {socialLogins && (
            <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    O continuar con
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={socialLogins.onGoogleSignIn}
                disabled={socialLogins.isGoogleLoading || isLoading}
              >
                <Chrome className="mr-2 h-5 w-5" />
                Google
              </Button>
            </>
          )}
        </CardContent>
        {footerContent && (
            <CardFooter className="justify-center text-sm">
                {footerContent}
            </CardFooter>
        )}
      </Card>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} Family Trip Planner. Todos los derechos reservados.
      </p>
    </div>
  );
}
