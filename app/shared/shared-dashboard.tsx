"use client";

import { useEffect, useState } from "react";
import { Dashboard, type SharedProject } from "../page";

type Props = SharedProject;
type DashboardSection = "home" | "overall" | "market" | "execution" | "outcome";

const sectionMap: Record<string, DashboardSection> = {
  home: "home",
  overall: "overall",
  market: "market",
  execution: "execution",
  outcome: "outcome",
};

export default function SharedDashboard({ token, ...project }: Props) {
  const [section, setSection] = useState<DashboardSection>("home");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("section") || "home";
    setSection(sectionMap[requested] || "home");
  }, []);

  return <Dashboard section={section} sharedProject={{ token, ...project }} />;
}
