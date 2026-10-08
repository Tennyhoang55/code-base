export class AppError extends Error {}

export function actionMessage(error: unknown) {
  return error instanceof AppError
    ? error.message
    : "Không thể lưu lúc này. Kiểm tra kết nối và thử lại.";
}
