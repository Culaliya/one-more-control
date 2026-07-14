import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Choose the control that proves you wrong",
};

export default function HomePage() {
  return <LandingPage />;
}
