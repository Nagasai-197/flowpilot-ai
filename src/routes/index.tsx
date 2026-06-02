import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlowPilot AI — Your AI-Powered Personal Life OS" },
      {
        name: "description",
        content:
          "FlowPilot AI plans your day, balances your focus, and adapts to how you work. Built for makers, students, and operators.",
      },
    ],
  }),
});
