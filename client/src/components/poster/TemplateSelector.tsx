"use client";

import React from "react";
import { TemplateItem } from "../../services/poster.service";

interface TemplateSelectorProps {
  templates: TemplateItem[];
  selectedTemplateId: string;
  onSelectTemplate: (template: TemplateItem) => void;
  isLoading?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse flex flex-col justify-end p-4"
          >
            <div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-zinc-300 dark:bg-zinc-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        No poster templates available at the moment.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Select Poster Template <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = template._id === selectedTemplateId;
          return (
            <div
              key={template._id}
              onClick={() => onSelectTemplate(template)}
              className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all p-3 flex flex-col justify-between ${
                isSelected
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-400 dark:hover:border-zinc-700"
              }`}
            >
              {/* Preview Box */}
              <div className="relative w-full h-36 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                {template.previewUrl ? (
                  <img
                    src={template.previewUrl}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <span className="text-xs text-zinc-400">No Preview</span>
                )}
                <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {template.occasion}
                </span>
              </div>

              {/* Info */}
              <div>
                <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                  {template.name}
                </h4>
                {template.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                    {template.description}
                  </p>
                )}
              </div>

              {/* Active Indicator Badge */}
              {isSelected && (
                <div className="absolute top-3 left-3 bg-emerald-500 text-white p-1 rounded-full shadow">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
