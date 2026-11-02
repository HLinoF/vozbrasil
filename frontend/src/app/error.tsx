"use client";
import { ErrorState } from "@/components/shared";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container page">
      <ErrorState
        message="Ocorreu um erro ao abrir esta página."
        retry={reset}
      />
    </div>
  );
}
