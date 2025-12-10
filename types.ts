export interface GenerateRequest {
  prompt: string;
}

export interface GenerateResponse {
  image_url: string;
}

export interface ApiError {
  message: string;
}
