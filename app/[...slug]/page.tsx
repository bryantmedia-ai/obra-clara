import { redirect } from "next/navigation";
import { SaasApp } from "@/components/saas-app";

export default async function CatchAllPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  if (["quienes-somos", "como-funciona"].includes(slug[0].toLowerCase())) redirect("/hackatwin");
  if (["transporte", "transportes"].includes(slug[0].toLowerCase())) redirect(process.env.NEXT_PUBLIC_OC_ROLE === "provider" ? "/ordenes" : "/marketplace");
  return <SaasApp route={slug.join("/")} />;
}
