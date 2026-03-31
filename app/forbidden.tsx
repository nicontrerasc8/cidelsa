import Link from "next/link";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
          <Lock className="size-7" />
        </div>
        <p className="mt-6 text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Acceso restringido
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          No tienes permisos para entrar a este módulo
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Tu sesión es válida, pero tu rol actual no tiene acceso a este recurso.
          Si necesitas verlo, hay que asignarte un rol o scope compatible en
          Supabase.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/dashboard/imports">
            <Button>Volver al dashboard</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
