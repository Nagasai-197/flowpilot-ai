import { createLazyFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/auth/AuthScreen";

export const Route = createLazyFileRoute("/signup")({
  component: Signup,
});

function Signup() {
  return <AuthScreen mode="signup" />;
}
