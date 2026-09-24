import { Fragment, type ReactNode } from "react";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type Segment =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "strike"; value: string };

/**
 * Parses WhatsApp-style *bold*, _italic_, and ~strike~ markers on escaped text.
 */
export function parseWhatsAppSegments(raw: string): Segment[] {
  const escaped = escapeHtml(raw);
  const pattern = /(\*([^*\n]+)\*|_([^_\n]+)_|~([^~\n]+)~)/g;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(escaped)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: "text", value: escaped.slice(lastIndex, match.index) });
    }
    if (match[2] !== undefined) {
      segments.push({ kind: "bold", value: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ kind: "italic", value: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ kind: "strike", value: match[4] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < escaped.length) {
    segments.push({ kind: "text", value: escaped.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ kind: "text", value: escaped });
  }

  return segments;
}

export function renderWhatsAppSegments(segments: Segment[]): ReactNode[] {
  return segments.map((segment, index) => {
    const key = `${segment.kind}-${index}`;
    switch (segment.kind) {
      case "bold":
        return <strong key={key}>{segment.value}</strong>;
      case "italic":
        return <em key={key}>{segment.value}</em>;
      case "strike":
        return <s key={key}>{segment.value}</s>;
      default:
        return <Fragment key={key}>{segment.value}</Fragment>;
    }
  });
}

export function WhatsAppFormattedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const segments = parseWhatsAppSegments(text);
  return (
    <p className={className}>
      {renderWhatsAppSegments(segments)}
    </p>
  );
}
