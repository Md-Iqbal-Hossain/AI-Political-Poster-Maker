"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  TemplateItem,
  uploadImage,
  uploadImages,
  generatePoster,
  PosterResponseData,
} from "../../services/poster.service";
import { TemplateSelector } from "./TemplateSelector";

interface PosterFormProps {
  templates: TemplateItem[];
  isLoadingTemplates: boolean;
}

export const PosterForm: React.FC<PosterFormProps> = ({
  templates,
  isLoadingTemplates,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);
  const [headline, setHeadline] = useState("");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [party, setParty] = useState("");
  const [location, setLocation] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<PosterResponseData | null>(null);

  const filePreviews = useMemo(() => {
    return selectedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      filePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [filePreviews]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const incomingFiles = Array.from(e.target.files);
    const totalCount = selectedFiles.length + incomingFiles.length;

    if (totalCount > 3) {
      setError("Maximum 3 photos allowed. You cannot select more than 3 photos.");
      e.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

    for (const file of incomingFiles) {
      if (!allowedTypes.includes(file.type)) {
        setError(`Unsupported file type: ${file.name}. Only JPEG, PNG, and WEBP images are allowed.`);
        e.target.value = "";
        return;
      }
      if (file.size > maxSizeBytes) {
        setError(`File size exceeds 5MB limit: ${file.name}. Please select smaller images.`);
        e.target.value = "";
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...incomingFiles]);
    e.target.value = "";
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGeneratedResult(null);

    // Form Validation
    if (!selectedTemplate) {
      setError("Please select a poster template.");
      return;
    }
    if (!headline.trim()) {
      setError("Bangla headline is required.");
      return;
    }
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!designation.trim()) {
      setError("Designation is required.");
      return;
    }
    if (!party.trim()) {
      setError("Party/Organization is required.");
      return;
    }
    if (!location.trim()) {
      setError("Location is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      let photoUrls: string[] = [];

      // 1. Optional Multi-Image Upload Step
      if (selectedFiles.length > 0) {
        setStatusMessage(
          `Uploading ${selectedFiles.length} leader photo${selectedFiles.length > 1 ? "s" : ""}...`
        );
        const uploadedImages = await uploadImages(selectedFiles);
        photoUrls = uploadedImages.map((img) => img.secureUrl);
      }

      // 2. Poster Generation Step
      setStatusMessage("Designing layout with AI & rendering poster...");
      const result = await generatePoster({
        templateId: selectedTemplate._id,
        occasion: selectedTemplate.occasion,
        headline: headline.trim(),
        name: name.trim(),
        designation: designation.trim(),
        party: party.trim(),
        location: location.trim(),
        photoUrls,
      });

      setGeneratedResult(result);
    } catch (err: any) {
      setError(err?.message || "An error occurred while generating the poster.");
    } finally {
      setIsSubmitting(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="space-y-8">
      {/* Form Container */}
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-zinc-900 p-4 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6"
      >
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          Poster Information & Layout Preferences
        </h2>

        {/* Template Selector */}
        <TemplateSelector
          templates={templates}
          selectedTemplateId={selectedTemplate?._id || ""}
          onSelectTemplate={(template) => setSelectedTemplate(template)}
          isLoading={isLoadingTemplates}
        />

        {/* Input Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          {/* Bangla Headline */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Bangla Headline (শিরোনাম) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="যেমন: সবাইকে মহান বিজয় দিবসের শুভেচ্ছা ও অভিনন্দন"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              required
            />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Leader Name (নাম) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: মোঃ জহিরুল ইসলাম"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              required
            />
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Designation (পদবী) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="যেমন: সাধারণ সম্পাদক"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              required
            />
          </div>

          {/* Party / Organization */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Party / Organization (সংগঠন) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder="যেমন: বাংলাদেশ ছাত্র ফ্রন্ট"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Location (শাখা / এলাকা) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="যেমন: ঢাকা উত্তর শাখা"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              required
            />
          </div>

          {/* Photo Upload (Optional, up to 3) */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Upload Leader Photos <span className="text-xs text-zinc-500 font-normal">(Optional, up to 3)</span>
              </label>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {selectedFiles.length}/3 selected
              </span>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 hover:file:bg-emerald-100 cursor-pointer"
            />
            
            {/* Selected Photo Thumbnails */}
            {filePreviews.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-2">
                {filePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative group w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 shadow-sm"
                  >
                    <img
                      src={preview.url}
                      alt={`Selected photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-colors focus:outline-none"
                      title="Remove photo"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                      #{index + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Loading / Status Indicator */}
        {isSubmitting && (
          <div className="flex items-center space-x-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-sm">
            <svg
              className="animate-spin h-5 w-5 text-emerald-600"
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
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isLoadingTemplates}
          className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Generating AI Poster..." : "Generate Political Poster"}
        </button>
      </form>

      {/* Generated Result Container */}
      {generatedResult && (
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-8 rounded-2xl border border-emerald-200 dark:border-emerald-900 shadow-md space-y-6">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate">
                Generated Poster Result
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                Poster ID: {generatedResult.posterId}
              </p>
            </div>
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full shrink-0">
              Status: Ready
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Generated Image Preview */}
            <div className="flex justify-center bg-zinc-100 dark:bg-zinc-950 p-3 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <img
                src={generatedResult.generatedImageUrl}
                alt="Generated Political Poster"
                className="max-h-[500px] sm:max-h-[600px] max-w-full w-auto object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Layout Specs */}
            <div className="space-y-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                AI Layout Parameters
              </h4>
              <ul className="text-xs space-y-2 text-zinc-600 dark:text-zinc-300">
                <li className="flex justify-between">
                  <span>Background Color:</span>
                  <span className="font-mono font-semibold">{generatedResult.layout.backgroundColor}</span>
                </li>
                <li className="flex justify-between">
                  <span>Accent Color:</span>
                  <span className="font-mono font-semibold">{generatedResult.layout.accentColor}</span>
                </li>
                <li className="flex justify-between">
                  <span>Photo Placement:</span>
                  <span className="font-semibold">{generatedResult.layout.photoPlacement}</span>
                </li>
                <li className="flex justify-between">
                  <span>Headline Placement:</span>
                  <span className="font-semibold">{generatedResult.layout.headlinePlacement}</span>
                </li>
                <li className="flex justify-between">
                  <span>Decorative Style:</span>
                  <span className="font-semibold">{generatedResult.layout.decorativeStyle}</span>
                </li>
              </ul>

              {generatedResult.layout.designNotes && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs font-semibold block text-zinc-700 dark:text-zinc-300">
                    Design Rationale:
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 italic mt-0.5">
                    "{generatedResult.layout.designNotes}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
