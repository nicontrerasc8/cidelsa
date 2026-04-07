import { LoaderCircle } from "lucide-react";

export function RouteLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/18 backdrop-blur-[2px]">
      <div className="flex min-w-[240px] items-center gap-4 rounded-[1.75rem] border border-white/15 bg-[#07131f]/92 px-5 py-4 text-white shadow-[0_24px_60px_rgba(7,19,31,0.35)]">
        <div className="rounded-2xl bg-white/10 p-3">
          <LoaderCircle className="size-6 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold">Cargando vista</p>
          <p className="mt-1 text-xs text-white/72">
            Preparando la siguiente pantalla.
          </p>
        </div>
      </div>
    </div>
  );
}
