export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado.') {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
