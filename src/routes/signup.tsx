import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — FlowPilot AI" }] }),
  component: () => <AuthScreen mode="signup" />,
});
