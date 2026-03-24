/** Returns the org name saved during onboarding, or "PROJEC" as fallback. */
export function getOrgName(): string {
  return localStorage.getItem("onboardingName") || "PROJEC";
}
