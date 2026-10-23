import { notFound } from "next/navigation";
import AuthScreen from "@/components/AuthScreen";

export default async function AuthPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (mode !== "sign-in" && mode !== "sign-up" && mode !== "forgot" && mode !== "reset") notFound();
  return <AuthScreen mode={mode} />;
}
