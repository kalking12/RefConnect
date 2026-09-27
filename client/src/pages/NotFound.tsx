import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f9f7] px-6 py-16 text-[#173c32]">
      <div className="w-full max-w-md text-center">
        <img
          className="mx-auto mb-8 h-16 w-[230px] max-w-full rounded-xl object-cover object-center dark:bg-[#f8fbf7]"
          src="/brand/refconnect-logo.png"
          alt="RefConnect"
        />
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#486a5e]">
          404
        </p>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mb-8 text-base leading-relaxed text-[#486a5e]">
          This page may have moved. Return to the hospital directory to
          continue.
        </p>
        <Button
          type="button"
          onClick={() => setLocation("/")}
          className="min-h-11 bg-[#1b614b] text-white hover:bg-[#154c3c]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Return to directory
        </Button>
      </div>
    </main>
  );
}
