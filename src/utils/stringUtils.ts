export const normalizeEmail = (email?: string | null): string | null => {
  if (!email) {
    return null;
  }

  const normalized = String(email).trim().toLowerCase();
  return normalized.length ? normalized : null;
};

export const normalizeText = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length ? normalized : null;
};
