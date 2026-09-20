export interface RequestOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export class HttpError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, statusText = "") {
    super(`HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export class FetchHttpClient {
  async request<T = unknown>({ method, url, headers = {}, body }: RequestOptions): Promise<T> {
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const responseBody = await this.parseResponseBody(response);

    if (!response.ok) {
      throw new HttpError(response.status, responseBody, response.statusText);
    }

    return responseBody as T;
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";
    const rawBody = await response.text();

    if (!rawBody) {
      return null;
    }

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(rawBody);
      } catch {
        return rawBody;
      }
    }

    return rawBody;
  }
}
