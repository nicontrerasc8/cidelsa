"use client";

import { useActionState } from "react";
import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/modules/auth/server/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <Card className="border-white/60 bg-white/80">
      <CardContent className="space-y-5">
        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                id="email"
                name="email"
                type="email"
                placeholder="tu@empresa.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                id="password"
                name="password"
                type="password"
                placeholder="********"
                required
              />
            </div>
          </div>

          {state?.error ? (
            <p className="rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-700 dark:bg-orange-950 dark:text-orange-300">
              {state.error}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Acceder
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
