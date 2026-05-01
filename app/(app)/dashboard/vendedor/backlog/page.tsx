import { redirect } from "next/navigation";

export default async function SellerBacklogPage() {
  redirect("/dashboard?tab=vendedor-backlog");
}
