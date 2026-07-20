"use client";
import ReactMarkdown from "react-markdown";
import { cleanMd } from "@/lib/cleanMd";
import { MD_REMARK, MD_REHYPE } from "@/lib/mdConfig";

interface MdProps {
  children: string;
  className?: string;
}

export default function Md({ children, className }: MdProps) {
  const content = cleanMd(children ?? "");
  const inner = (
    <ReactMarkdown remarkPlugins={MD_REMARK} rehypePlugins={MD_REHYPE}>
      {content}
    </ReactMarkdown>
  );
  return className ? <div className={className}>{inner}</div> : <>{inner}</>;
}
