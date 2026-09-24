"use client";

import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

export function ConnectLinkField({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | null>(null);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/connect/${token}`
      : `/connect/${token}`;

  async function onCopy() {
    const fullUrl = `${window.location.origin}/connect/${token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setManualUrl(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setManualUrl(fullUrl);
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Connect link</label>
      <div className="flex gap-2">
        <input
          readOnly
          value={manualUrl ?? url}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-muted"
        />
        <button
          type="button"
          onClick={() => void onCopy()}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-stone-50"
        >
          <Copy className="h-4 w-4" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
      >
        Open the owner&apos;s page
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      </a>
    </div>
  );
}
