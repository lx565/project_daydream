/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enforce the canonical host: 308-redirect the apex domain to www so Google
  // sees a single host (matches every page's canonical → https://www.mingli.study).
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "mingli.study" }],
        destination: "https://www.mingli.study/:path*",
        permanent: true,
      },
    ];
  },

  // Ensure the knowledge base + vector store are bundled into the serverless
  // functions that read them via fs (the tracer can't follow dynamic paths).
  outputFileTracingIncludes: {
    "/api/**": [
      "./knowledge/chunks.json",
      "./knowledge/embeddings.i8",
      "./knowledge/embeddings.meta.json",
    ],
    // Star×palace and guide SEO pages call getKnowledge() at ISR render time,
    // and read pre-generated/proofread articles from ./content/seo when present.
    "/star/**": [
      "./knowledge/chunks.json",
      "./knowledge/embeddings.i8",
      "./knowledge/embeddings.meta.json",
      "./content/seo/**",
    ],
    "/guide/**": [
      "./knowledge/chunks.json",
      "./knowledge/embeddings.i8",
      "./knowledge/embeddings.meta.json",
      "./content/seo/**",
    ],
    "/palace/**": [
      "./knowledge/chunks.json",
      "./knowledge/embeddings.i8",
      "./knowledge/embeddings.meta.json",
      "./content/seo/**",
    ],
    // mingge & personality use ISR (revalidate); famous reads pre-gen content too.
    // Without bundling content/seo, a revalidation inside the serverless function
    // can't find the proofread JSON and silently falls back to paid live AI synthesis.
    "/mingge/**": [
      "./knowledge/chunks.json",
      "./knowledge/embeddings.i8",
      "./knowledge/embeddings.meta.json",
      "./content/seo/**",
    ],
    "/personality/**": [
      "./knowledge/chunks.json",
      "./knowledge/embeddings.i8",
      "./knowledge/embeddings.meta.json",
      "./content/seo/**",
    ],
    "/famous/**": [
      "./knowledge/chunks.json",
      "./knowledge/embeddings.i8",
      "./knowledge/embeddings.meta.json",
      "./content/seo/**",
    ],
  },
};
export default nextConfig;
