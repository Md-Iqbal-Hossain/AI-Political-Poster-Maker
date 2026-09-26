"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/generate");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl space-y-6">
        <span className="inline-block bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          AI Poster Studio
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
          AI Political Poster Maker
        </h1>
        <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Create customized, high-quality political posters automatically powered by Gemini AI layout suggestion and Puppeteer image rendering.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          {loading ? (
            <div className="text-xs text-zinc-500">Checking session...</div>
          ) : user ? (
            <Link
              href="/generate"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
            >
              Go to Studio
            </Link>
          ) : (
            <Link
              href="/login"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors"
            >
              Sign In to Start
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
