"use client";

import { AlertTriangle } from "lucide-react";

export function DisconnectedBanner({
  onReconnect,
}: {
  onReconnect: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-2xl bg-rose-900 px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Your WhatsApp is disconnected</p>
          <p className="mt-0.5 text-sm text-rose-100/95">
            Customers who message you won&apos;t get a reply until you reconnect.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReconnect}
        className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-50"
      >
        Reconnect WhatsApp
      </button>
    </div>
  );
}
