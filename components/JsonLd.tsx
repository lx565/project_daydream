// Renders one or more JSON-LD schema objects into a <script> tag.
// Server component (no "use client") — emitted in the static HTML so crawlers
// see it without executing JS.
export default function JsonLd({ data }: { data: object | object[] }) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <script
      type="application/ld+json"
      // schema objects are built from our own typed data, no user input
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload.length === 1 ? payload[0] : payload),
      }}
    />
  );
}
