export interface Response {
  message: string;
  data?: string;
  error: boolean;
}

export const successReponse = (message: string, data: string): Response => ({
  message,
  data,
  error: false,
});

export const errorReponse = (message: string, data?: string): Response => ({
  message,
  data,
  error: true,
});
