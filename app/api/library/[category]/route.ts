import fs from "fs";
import path from "path";

const FOLDER_BY_SLUG: Record<string, string> = {
  star: "star",
  palace: "palace",
  mingge: "mingge",
  shensha: "shensha",
  book: "book",
};

export async function GET(request: Request, { params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const folder = FOLDER_BY_SLUG[category];
  if (!folder) return Response.json({ error: "unknown_category" }, { status: 404 });

  const dir = path.join(process.cwd(), "content", "seo", folder);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return Response.json({ articles: [] });
  }

  const articles = files.map((filename) => {
    const slug = filename.replace(/\.json$/, "");
    let label = slug;
    try {
      const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
      const parsed = JSON.parse(raw);
      if (typeof parsed.label === "string") label = parsed.label;
    } catch {
      // fall back to the filename-derived slug as the label
    }
    return { slug, label };
  });

  return Response.json({ articles });
}
