import SoftwareManager from "@/app/components/SoftwareManager";
import { getAll } from "@/lib/db";
import { getCategories } from "@/lib/categoriesDb";

export const dynamic = "force-dynamic";

export default async function Home() {
  const software = await getAll();
  const categories = await getCategories();
  return <SoftwareManager software={software} categories={categories} />;
}
