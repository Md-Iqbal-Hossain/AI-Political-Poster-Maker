const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface TemplateItem {
  _id: string;
  name: string;
  occasion: string;
  description?: string;
  previewUrl?: string;
  layoutConfig?: Record<string, any>;
}

export interface GeneratePosterRequest {
  templateId: string;
  occasion: string;
  headline: string;
  name: string;
  designation: string;
  party: string;
  location: string;
  photoUrl?: string;
}

export interface PosterResponseData {
  posterId: string;
  generatedImageUrl: string;
  generatedImagePublicId: string;
  templateId: string;
  layout: {
    backgroundColor: string;
    accentColor: string;
    photoPlacement: string;
    headlinePlacement: string;
    decorativeStyle: string;
    designNotes?: string;
  };
}

/**
 * Fetches available templates from Express API.
 */
export const fetchTemplates = async (): Promise<TemplateItem[]> => {
  const response = await fetch(`${API_BASE_URL}/templates`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch templates');
  }

  return data.templates || [];
};

/**
 * Uploads an image file to Express backend /uploads/image endpoint.
 */
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/uploads/image`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to upload image');
  }

  return data.secureUrl;
};

/**
 * Requests poster generation from Express backend /posters/generate endpoint.
 */
export const generatePoster = async (
  payload: GeneratePosterRequest
): Promise<PosterResponseData> => {
  const response = await fetch(`${API_BASE_URL}/posters/generate`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in to generate a poster.');
    }
    throw new Error(data.message || 'Failed to generate poster');
  }

  return data.data;
};

export interface PosterItem {
  _id: string;
  userId: string;
  templateId: string;
  occasion: string;
  headline: string;
  name: string;
  designation: string;
  party: string;
  location: string;
  originalImageUrl?: string;
  generatedImageUrl: string;
  generatedImagePublicId: string;
  layout?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export interface PosterHistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PosterHistoryResponseData {
  posters: PosterItem[];
  pagination: PosterHistoryPagination;
}

/**
 * Fetches user's poster generation history from Express backend /posters endpoint.
 */
export const getPosterHistory = async (
  page: number = 1,
  limit: number = 10
): Promise<PosterHistoryResponseData> => {
  const response = await fetch(
    `${API_BASE_URL}/posters?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in to view poster history.');
    }
    throw new Error(data.message || 'Failed to fetch poster history');
  }

  return {
    posters: data.data || [],
    pagination: data.pagination || {
      page,
      limit,
      total: 0,
      totalPages: 0,
    },
  };
};

/**
 * Requests poster regeneration from Express backend /posters/:id/regenerate endpoint.
 */
export const regeneratePoster = async (
  posterId: string
): Promise<PosterResponseData> => {
  const response = await fetch(`${API_BASE_URL}/posters/${posterId}/regenerate`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    if (response.status === 401) {
      throw new Error('Authentication required. Please log in to regenerate poster.');
    }
    if (response.status === 404) {
      throw new Error('Poster not found or access denied.');
    }
    throw new Error(data.message || 'Failed to regenerate poster');
  }

  return data.data;
};


