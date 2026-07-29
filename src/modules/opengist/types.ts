export interface State {
  [key: string]: unknown;
}

export interface Gist {
  id: string;
  files: Record<string, GistFile>;
}

export interface GistFile {
  filename: string;
  content: string;
  size: number;
  truncated: boolean;
}

export interface GistUpdateRequest {
  files: Record<string, GistUpdateFileInput | null>;
}

export interface GistUpdateFileInput {
  content?: string;
  filename?: string;
}
