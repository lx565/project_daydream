import { MAJOR_STARS } from "@/lib/starData";
import { normSeoKey } from "@/lib/seoContent";

const MAJOR_STAR_KEYS = new Set(MAJOR_STARS.map((s) => normSeoKey(s.name)));

/** The star/ folder should hold only the 14 major stars; auxiliary stars live in assistantstar/. */
export function isLibraryFileVisible(folder: string, filename: string): boolean {
  if (folder !== "star") return true;
  return MAJOR_STAR_KEYS.has(normSeoKey(filename.split("__")[0]));
}
