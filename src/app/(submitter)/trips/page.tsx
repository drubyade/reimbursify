"use client";

import { useRef } from "react";
import { TripsDashboard } from "@/components/trips-dashboard";

export default function TripsPage() {
  const tripsDashboardRef = useRef<any>(null);

  return (
    <TripsDashboard ref={tripsDashboardRef} />
  );
}
