"use client";

import {
  AGE_ELIGIBILITY_OPTIONS,
  AVAILABILITY_OPTIONS,
  BROAD_HEALTH_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  type AgeEligibility,
  type AvailabilityPreference,
  type BroadHealthAnswer,
  type ContactMethod,
  type TrialContactProfileInput,
} from "@/lib/trial-contact/schema";

type TrialContactProfileFieldsProps = {
  profile: TrialContactProfileInput;
  disabled: boolean;
  onChange: (profile: TrialContactProfileInput) => void;
};

export function TrialContactProfileFields({
  profile,
  disabled,
  onChange,
}: TrialContactProfileFieldsProps) {
  return (
    <fieldset className="border-input space-y-3 rounded-md border p-4">
      <legend className="px-1 text-sm font-medium">
        Trial contact profile
      </legend>
      <p className="text-muted-foreground text-sm">
        Optional matching details for approved trial-contact review. These
        fields do not enrol you in a study and are separate from general
        research sharing.
      </p>
      <label className="grid gap-1 text-sm">
        <span>Preferred contact method</span>
        <select
          className="border-input bg-background h-9 rounded-md border px-2"
          value={profile.preferredContactMethod ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...profile,
              preferredContactMethod: contactMethod(event.target.value),
            })
          }
        >
          <option value="">Not selected</option>
          {CONTACT_METHOD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span>Country or region</span>
        <input
          className="border-input bg-background h-9 rounded-md border px-2"
          value={profile.countryRegion ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...profile, countryRegion: event.target.value })
          }
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span>Age eligibility</span>
        <select
          className="border-input bg-background h-9 rounded-md border px-2"
          value={profile.ageEligibility ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...profile,
              ageEligibility: ageEligibility(event.target.value),
            })
          }
        >
          <option value="">Not selected</option>
          {AGE_ELIGIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Broad health eligibility
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {BROAD_HEALTH_OPTIONS.map((option) => (
            <label key={option.value} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.broadHealthAnswers.includes(option.value)}
                disabled={disabled}
                onChange={(event) =>
                  onChange({
                    ...profile,
                    broadHealthAnswers: toggleAnswer(
                      profile.broadHealthAnswers,
                      option.value,
                      event.target.checked,
                    ),
                  })
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-1 text-sm">
        <span>Availability preference</span>
        <select
          className="border-input bg-background h-9 rounded-md border px-2"
          value={profile.availabilityPreference ?? ""}
          disabled={disabled}
          onChange={(event) =>
            onChange({
              ...profile,
              availabilityPreference: availabilityPreference(
                event.target.value,
              ),
            })
          }
        >
          <option value="">Not selected</option>
          {AVAILABILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}

function toggleAnswer(
  current: BroadHealthAnswer[],
  value: BroadHealthAnswer,
  checked: boolean,
) {
  if (checked) return [...new Set([...current, value])];
  return current.filter((item) => item !== value);
}

function contactMethod(value: string): ContactMethod | null {
  return value ? (value as ContactMethod) : null;
}

function ageEligibility(value: string): AgeEligibility | null {
  return value ? (value as AgeEligibility) : null;
}

function availabilityPreference(value: string): AvailabilityPreference | null {
  return value ? (value as AvailabilityPreference) : null;
}
