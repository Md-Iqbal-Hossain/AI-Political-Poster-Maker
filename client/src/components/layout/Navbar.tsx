"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../hooks/useAuth";

export const Navbar: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const isLinkActive = (path: string) => pathname === path;

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo / Text */}
        <Link
          href={user ? "/generate" : "/"}
          className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100 font-extrabold text-lg tracking-tight"
        >
          <span className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
            AI
          </span>
          <span>Poster Maker</span>
        </Link>

        {/* Navigation Items */}
        {!loading && (
          <nav className="flex items-center space-x-3 sm:space-x-5">
            {!user ? (
              /* Unauthenticated Navigation */
              <Link
                href="/login"
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                  isLinkActive("/login")
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                Login
              </Link>
            ) : (
              /* Authenticated Navigation */
              <>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <Link
                    href="/generate"
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                      isLinkActive("/generate")
                        ? "bg-zinc-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    Generate
                  </Link>
                  <Link
                    href="/history"
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                      isLinkActive("/history")
                        ? "bg-zinc-100 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-400"
                        : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }`}
                  >
                    History
                  </Link>
                </div>

                <div className="flex items-center space-x-3 border-l border-zinc-200 dark:border-zinc-800 pl-3 sm:pl-4">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline truncate max-w-[150px]">
                    {user.name || user.email}
                  </span>

                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
