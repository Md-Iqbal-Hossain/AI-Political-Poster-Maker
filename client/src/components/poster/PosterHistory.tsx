"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  getPosterHistory,
  regeneratePoster,
  PosterItem,
  PosterHistoryPagination,
} from "../../services/poster.service";

interface PosterHistoryProps {
  limit?: number;
}

export const PosterHistory: React.FC<PosterHistoryProps> = ({ limit = 6 }) => {
  const [posters, setPosters] = useState<PosterItem[]>([]);
  const [pagination, setPagination] = useState<PosterHistoryPagination>({
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(
    async (pageToFetch: number) => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await getPosterHistory(pageToFetch, limit);
        setPosters(res.posters);
        setPagination(res.pagination);
      } catch (err: any) {
        setError(
          err?.message || "Failed to load poster history. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage, fetchHistory]);

  const handleRegenerate = async (posterId: string) => {
    if (regeneratingId) return;

    try {
      setRegeneratingId(posterId);
      setError(null);
      await regeneratePoster(posterId);
      // Refresh history to page 1 so the newly generated poster appears at the top
      setCurrentPage(1);
      await fetchHistory(1);
    } catch (err: any) {
      setError(
        err?.message || "Failed to regenerate poster. Please try again."
      );
    } finally {
      setRegeneratingId(null);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1 && !isLoading && !regeneratingId) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pagination.totalPages && !isLoading && !regeneratingId) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Loading State for History Fetch */}
      {isLoading && (
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[300px]">
          <svg
            className="animate-spin h-8 w-8 text-emerald-600"
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
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Loading poster history...
          </p>
        </div>
      )}

      {/* Error State Banner */}
      {!isLoading && error && (
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-red-200 dark:border-red-900 shadow-sm space-y-4">
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
          <button
            onClick={() => fetchHistory(currentPage)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && posters.length === 0 && (
        <div className="bg-white dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            No Posters Found
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            You haven't generated any posters yet. Head over to the poster generator to create your first design.
          </p>
          <a
            href="/generate"
            className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition-colors"
          >
            Create First Poster
          </a>
        </div>
      )}

      {/* Posters Grid */}
      {!isLoading && !error && posters.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posters.map((poster) => {
              const isThisRegenerating = regeneratingId === poster._id;
              const isAnyRegenerating = regeneratingId !== null;

              return (
                <div
                  key={poster._id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  {/* Poster Preview Image */}
                  <div className="relative bg-zinc-100 dark:bg-zinc-950 aspect-[3/4] overflow-hidden flex items-center justify-center p-3 border-b border-zinc-100 dark:border-zinc-800">
                    <img
                      src={poster.generatedImageUrl}
                      alt={poster.headline || poster.occasion}
                      className="max-h-full max-w-full object-contain rounded shadow-sm"
                    />
                  </div>

                  {/* Poster Details */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full truncate">
                          {poster.occasion}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                          {formatDate(poster.createdAt)}
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100 line-clamp-1">
                        {poster.name}
                      </h4>

                      <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                        <p className="line-clamp-1">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            Designation:
                          </span>{" "}
                          {poster.designation}
                        </p>
                        <p className="line-clamp-1">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            Party:
                          </span>{" "}
                          {poster.party}
                        </p>
                        <p className="line-clamp-1">
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                            Location:
                          </span>{" "}
                          {poster.location}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                      <a
                        href={poster.generatedImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 px-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium text-xs rounded-xl transition-colors"
                      >
                        View
                      </a>

                      <button
                        onClick={() => handleRegenerate(poster._id)}
                        disabled={isAnyRegenerating}
                        className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5"
                      >
                        {isThisRegenerating ? (
                          <>
                            <svg
                              className="animate-spin h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
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
                            <span>Regenerating...</span>
                          </>
                        ) : (
                          <span>Regenerate</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || isLoading || regeneratingId !== null}
                className="px-3 sm:px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                Previous
              </button>

              <span className="text-[11px] sm:text-xs font-medium text-zinc-600 dark:text-zinc-400 text-center truncate">
                Page {pagination.page} of {pagination.totalPages} <span className="hidden min-[400px]:inline">(Total: {pagination.total})</span>
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= pagination.totalPages || isLoading || regeneratingId !== null}
                className="px-3 sm:px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
