"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";
import { fetchTemplates, TemplateItem } from "../../services/poster.service";
import { PosterForm } from "../../components/poster/PosterForm";

export default function GeneratePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Authentication Protection Effect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Load Templates Effect
  useEffect(() => {
    if (!user) return;

    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        setFetchError(null);
        const data = await fetchTemplates();
        setTemplates(data);
      } catch (err: any) {
        setFetchError(
          err?.message || "Failed to load templates. Please make sure the backend server is running."
        );
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4 flex items-center justify-center">
        <div className="flex items-center space-x-3 text-zinc-600 dark:text-zinc-400">
          <svg
            className="animate-spin h-6 w-6 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-sm font-medium">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <span className="inline-block bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            AI Poster Studio
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
            AI Political Poster Maker
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Select a political celebration template, enter candidate details, and let Gemini AI curate visual styling and layout automatically.
          </p>
        </div>

        {/* Fetch Error Banner */}
        {fetchError && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-sm flex items-center justify-between">
            <span>{fetchError}</span>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main Poster Form */}
        <PosterForm templates={templates} isLoadingTemplates={isLoadingTemplates} />
      </div>
    </div>
  );
}
