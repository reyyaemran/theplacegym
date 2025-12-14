/**
 * Centralized API client for making HTTP requests
 * Provides consistent error handling, retries, and request/response transformation
 */

import { logger } from "./logger";

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  retries?: number;
  retryDelay?: number;
}

interface ApiResponse<T> {
  data: T;
  error?: ApiError;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = "/api") {
    this.baseURL = baseURL;
  }

  private buildURL(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(endpoint, this.baseURL.startsWith("http") ? this.baseURL : window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.pathname + url.search;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get("content-type");
    const isJson = contentType?.includes("application/json");

    let data: unknown;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (error) {
      logger.error("Failed to parse response", error instanceof Error ? error : new Error(String(error)));
      throw new ApiClientError(
        "Failed to parse response",
        "PARSE_ERROR",
        response.status
      );
    }

    if (!response.ok) {
      const error = isJson && typeof data === "object" && data !== null && "error" in data
        ? (data as { error: ApiError }).error
        : {
            code: "UNKNOWN_ERROR",
            message: typeof data === "string" ? data : "An error occurred",
            statusCode: response.status,
          };

      logger.error("API request failed", undefined, {
        url: response.url,
        status: response.status,
        error,
      });

      throw new ApiClientError(
        error.message,
        error.code,
        error.statusCode,
        error.details
      );
    }

    // Handle both direct data and wrapped responses
    if (isJson && typeof data === "object" && data !== null) {
      if ("data" in data) {
        return (data as ApiResponse<T>).data;
      }
    }

    return data as T;
  }

  private async requestWithRetry<T>(
    url: string,
    options: RequestOptions,
    retries: number = 0
  ): Promise<T> {
    const maxRetries = options.retries ?? 0;
    const retryDelay = options.retryDelay ?? 1000;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      return await this.handleResponse<T>(response);
    } catch (error) {
      // Only retry on network errors or 5xx status codes
      const shouldRetry =
        retries < maxRetries &&
        (error instanceof TypeError || // Network error
          (error instanceof ApiClientError && error.statusCode >= 500));

      if (shouldRetry) {
        logger.warn(`Retrying request (${retries + 1}/${maxRetries})`, { url });
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (retries + 1)));
        return this.requestWithRetry<T>(url, options, retries + 1);
      }

      throw error;
    }
  }

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildURL(endpoint, options.params);
    logger.debug("API GET request", { url, params: options.params });

    return this.requestWithRetry<T>(url, {
      ...options,
      method: "GET",
    });
  }

  async post<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.buildURL(endpoint, options.params);
    logger.debug("API POST request", { url, data });

    return this.requestWithRetry<T>(url, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const url = this.buildURL(endpoint, options.params);
    logger.debug("API PUT request", { url, data });

    return this.requestWithRetry<T>(url, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildURL(endpoint, options.params);
    logger.debug("API DELETE request", { url });

    return this.requestWithRetry<T>(url, {
      ...options,
      method: "DELETE",
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export for custom instances if needed
export { ApiClient };

