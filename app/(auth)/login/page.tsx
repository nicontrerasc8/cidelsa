import { redirect } from "next/navigation";

import { LoginForm } from "@/modules/auth/components/login-form";
import { getOptionalSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getOptionalSession();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden bg-[#08111d] px-10 py-12 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(147,197,253,0.25),_transparent_35%),linear-gradient(160deg,_rgba(15,61,94,0.92),_rgba(4,12,22,0.98))]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="relative z-10 flex max-w-xl flex-col justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-300">
              Cidelsa
            </p>
            <h1 className="mt-6 max-w-lg text-5xl font-semibold tracking-tight">
              Control ejecutivo para comercial, carga AX y analitica segura.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">
              Plataforma interna para trazabilidad de importaciones, limpieza de
              datos y dashboards gerenciales con acceso por rol y alcance real.
            </p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Acceso interno
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Iniciar sesion
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Usa tus credenciales corporativas registradas en Supabase Auth.
            </p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
