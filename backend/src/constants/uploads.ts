export const ALLOWED_UPLOAD_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'] as const
export const ALLOWED_UPLOAD_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'] as const
export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const INVALID_UPLOAD_MESSAGE = 'Arquivo inválido. Envie PNG, JPG, JPEG ou PDF com até 10 MB.'
