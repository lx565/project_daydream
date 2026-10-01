import fs from "fs";
import path from "path";

const CATEGORIES: { slug: string; label: string; folder: string }[] = [
  { slug: "star", label: "主星解析", folder: "star" },
  { slug: "palace", label: "宮位組合", folder: "palace" },
  { slug: "mingge", label: "格局解析", folder: "mingge" },
  { slug: "shensha", label: "凶格解析", folder: "shensha" },
  { slug: "book", label: "典籍出處", folder: "book" },
];

export async function GET() {
  const base = path.join(process.cwd(), "content", "seo");
  const categories = CATEGORIES.map((c) => {
    let count = 0;
    try {
      count = fs.readdirSync(path.join(base, c.folder)).filter((f) => f.endsWith(".json")).length;
    } catch {
      count = 0;
    }
    return { slug: c.slug, label: c.label, count };
  });
  return Response.json({ categories });
}
