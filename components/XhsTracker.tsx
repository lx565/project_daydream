"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
export default function XhsTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "xhs") {
      track("cta_from_xhs");
    }
  }, []);

  return null;
}
