import { createLazyFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const Route = createLazyFileRoute("/login")({
  component: Login,
});

function Login() {
  return <AuthScreen mode="login" />;
}
