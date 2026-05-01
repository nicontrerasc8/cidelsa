import { redirect } from "next/navigation";

export default async function SellerProjectionPage() {
  redirect("/dashboard?tab=vendedor-proyeccion");
}
