// Shared react-markdown plugin config so EVERY markdown renderer handles the
// <strong> HTML that cleanMd injects, identically.
//
// - remark-gfm: tables, strikethrough, autolinks (as before)
// - rehype-raw: parse the raw <strong> HTML cleanMd produces
// - rehype-sanitize: strip anything unsafe (the default GitHub schema already allows
//   <strong> and all standard markdown elements; cleanMd only ever injects <strong>
//   with no attributes, so nothing else can slip through from model output)
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const MD_REMARK: any = [remarkGfm];
export const MD_REHYPE: any = [rehypeRaw, [rehypeSanitize, defaultSchema]];
