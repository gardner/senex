export const TRIAL_CONTACT_CONSENT_VERSION = "trial-contact-v1";
export const TRIAL_CONTACT_PROFILE_VERSION = "trial-contact-profile-v1";

export const CONTACT_METHOD_OPTIONS = [
  { value: "account_email", label: "Email on my account" },
] as const;

export const AGE_ELIGIBILITY_OPTIONS = [
  { value: "under_18", label: "Under 18" },
  { value: "18_to_39", label: "18 to 39" },
  { value: "40_to_64", label: "40 to 64" },
  { value: "65_plus", label: "65+" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const BROAD_HEALTH_OPTIONS = [
  {
    value: "no_major_neurological_condition",
    label: "No major neurological condition",
  },
  {
    value: "memory_or_attention_concern",
    label: "Memory or attention concern",
  },
  {
    value: "diagnosed_cognitive_condition",
    label: "Diagnosed cognitive condition",
  },
  { value: "care_partner_available", label: "Care partner available" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: "remote_only", label: "Remote only" },
  { value: "in_person_if_local", label: "In person if local" },
  { value: "either", label: "Remote or in person" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export type TrialContactProfile = {
  profileVersion: string;
  preferredContactMethod: ContactMethod | null;
  countryRegion: string | null;
  ageEligibility: AgeEligibility | null;
  broadHealthAnswers: BroadHealthAnswer[];
  availabilityPreference: AvailabilityPreference | null;
  lastReviewedAt: string | null;
  updatedAt: string | null;
};

export type TrialContactProfileInput = {
  preferredContactMethod: ContactMethod | null;
  countryRegion: string | null;
  ageEligibility: AgeEligibility | null;
  broadHealthAnswers: BroadHealthAnswer[];
  availabilityPreference: AvailabilityPreference | null;
};

export type ContactMethod = (typeof CONTACT_METHOD_OPTIONS)[number]["value"];
export type AgeEligibility = (typeof AGE_ELIGIBILITY_OPTIONS)[number]["value"];
export type BroadHealthAnswer = (typeof BROAD_HEALTH_OPTIONS)[number]["value"];
export type AvailabilityPreference =
  (typeof AVAILABILITY_OPTIONS)[number]["value"];

export function emptyTrialContactProfile(): TrialContactProfile {
  return {
    profileVersion: TRIAL_CONTACT_PROFILE_VERSION,
    preferredContactMethod: null,
    countryRegion: null,
    ageEligibility: null,
    broadHealthAnswers: [],
    availabilityPreference: null,
    lastReviewedAt: null,
    updatedAt: null,
  };
}

export function emptyTrialContactProfileInput(): TrialContactProfileInput {
  return {
    preferredContactMethod: null,
    countryRegion: null,
    ageEligibility: null,
    broadHealthAnswers: [],
    availabilityPreference: null,
  };
}

export function sanitizeTrialContactProfile(
  value: unknown,
): TrialContactProfileInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("profile must be an object.");
  }
  const record = value as Record<string, unknown>;
  return {
    preferredContactMethod: optionalEnum(
      record.preferredContactMethod,
      CONTACT_METHOD_OPTIONS,
      "preferredContactMethod",
    ),
    countryRegion: optionalText(record.countryRegion, "countryRegion"),
    ageEligibility: optionalEnum(
      record.ageEligibility,
      AGE_ELIGIBILITY_OPTIONS,
      "ageEligibility",
    ),
    broadHealthAnswers: enumList(
      record.broadHealthAnswers,
      BROAD_HEALTH_OPTIONS,
      "broadHealthAnswers",
    ),
    availabilityPreference: optionalEnum(
      record.availabilityPreference,
      AVAILABILITY_OPTIONS,
      "availabilityPreference",
    ),
  };
}

export function isEmptyTrialContactProfile(profile: TrialContactProfileInput) {
  return (
    profile.preferredContactMethod === null &&
    profile.countryRegion === null &&
    profile.ageEligibility === null &&
    profile.broadHealthAnswers.length === 0 &&
    profile.availabilityPreference === null
  );
}

function optionalText(value: unknown, field: string) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 120) throw new Error(`${field} is too long.`);
  return trimmed;
}

function optionalEnum<const T extends ReadonlyArray<{ value: string }>>(
  value: unknown,
  options: T,
  field: string,
) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${field} must be a string.`);
  if (!options.some((option) => option.value === value)) {
    throw new Error(`${field} is not supported.`);
  }
  return value as T[number]["value"];
}

function enumList<const T extends ReadonlyArray<{ value: string }>>(
  value: unknown,
  options: T,
  field: string,
) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  const selected = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      throw new Error(`${field} must contain strings.`);
    }
    if (!options.some((option) => option.value === item)) {
      throw new Error(`${field} contains an unsupported value.`);
    }
    selected.add(item);
  }
  return [...selected] as T[number]["value"][];
}
