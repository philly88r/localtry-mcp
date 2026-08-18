export function authorizationResponseRedirect(
  redirectTo: string,
  issuer: string,
): string {
  const redirect = new URL(redirectTo);
  redirect.searchParams.set("iss", issuer);
  return redirect.toString();
}
