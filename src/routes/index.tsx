import { createFileRoute } from "@tanstack/react-router";
import { LikeAirApp } from "@/components/likeair/LikeAirApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LikeAir — Marketplace & Gigs for you" },
      {
        name: "description",
        content:
          "LikeAir is the P2P marketplace and gig board for Gen-Z university students. Buy, sell, and hustle across different areas, locations and more.",
      },
      {
        property: "og:title",
        content: "LikeAir — Marketplace & Gigs for you",
      },
      {
        property: "og:description",
        content:
          "LikeAir is the P2P campus marketplace and gig board for Gen-Z university students. Buy, sell, and hustle across different areas, locations and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LikeAirApp,
});
