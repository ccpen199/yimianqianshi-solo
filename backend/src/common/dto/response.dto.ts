export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string;
  code?: number;
}

export function SuccessResponse<T>(data: T, message = '操作成功'): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

export function ErrorResponse(message = '操作失败', code = 500): ApiResponse<null> {
  return {
    success: false,
    data: null,
    message,
    code,
  };
}
