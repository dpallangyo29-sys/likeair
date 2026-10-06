import { createFileRoute } from "@tanstack/react-router";
import { FeatureTutorial } from "@/components/likeair/FeatureTutorial";

export const Route = createFileRoute("/how-to")({
  head: () => ({
    meta: [
      { title: "How to use LikeAirGo — Quick tutorials" },
      {
        name: "description",
        content: "Short, click-by-click LikeAirGo tutorials for browsing, saving listings, and more.",
      },
    ],
  }),
  component: FeatureTutorial,
});
