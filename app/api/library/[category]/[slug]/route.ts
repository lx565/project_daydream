import fs from "fs";
import path from "path";

const FOLDER_BY_SLUG: Record<string, string> = {
  star: "star",
  palace: "palace",
  mingge: "mingge",
  shensha: "shensha",
  book: "book",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category: string; slug: string }> }
) {
  const { category, slug } = await params;
  const folder = FOLDER_BY_SLUG[category];
  if (!folder) return Response.json({ error: "unknown_category" }, { status: 404 });

  // slug comes straight from the URL — never interpolate it into a path without
  // stripping traversal characters first, even though it's only ever read, not written.
  const safeSlug = slug.replace(/[/\\]/g, "");
  const filePath = path.join(process.cwd(), "content", "seo", folder, `${safeSlug}.json`);

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.label !== "string" || typeof parsed.markdown !== "string") {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    return Response.json({ label: parsed.label, markdown: parsed.markdown });
  } catch {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
}
