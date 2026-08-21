export function getAuthRedirectUrl() {
  const configuredUrl = import.meta.env.VITE_AUTH_REDIRECT_URL as string | undefined;
  const baseUrl = configuredUrl?.trim() || window.location.origin;
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
