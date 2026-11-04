import { SaasApp } from "@/components/saas-app";

export default function HomePage() {
  return <SaasApp route={process.env.NEXT_PUBLIC_OC_ROLE==="buyer"?"marketplace":"dashboard"} />;
}
