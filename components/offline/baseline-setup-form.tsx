import { Button } from "@/components/ui/button";

export interface BaselineSetupFormProps {
  sleep: string;
  stress: string;
  distractions: string;
  notes: string;
  disabled: boolean;
  onSleepChange: (value: string) => void;
  onStressChange: (value: string) => void;
  onDistractionsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
}

export function BaselineSetupForm({
  sleep,
  stress,
  distractions,
  notes,
  disabled,
  onSleepChange,
  onStressChange,
  onDistractionsChange,
  onNotesChange,
  onSave,
}: BaselineSetupFormProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-medium">Baseline setup</h3>
        <p className="text-muted-foreground">
          These optional notes help interpret your own future results.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <SelectField
          id="sleep-last-night"
          label="Sleep last night"
          value={sleep}
          disabled={disabled}
          options={[
            ["prefer_not_to_answer", "Prefer not to answer"],
            ["less_than_5_hours", "Less than 5 hours"],
            ["5-6_hours", "5-6 hours"],
            ["7-8_hours", "7-8 hours"],
            ["more_than_8_hours", "More than 8 hours"],
          ]}
          onChange={onSleepChange}
        />
        <SelectField
          id="stress-today"
          label="Stress today"
          value={stress}
          disabled={disabled}
          options={[
            ["prefer_not_to_answer", "Prefer not to answer"],
            ["low", "Low"],
            ["medium", "Medium"],
            ["high", "High"],
          ]}
          onChange={onStressChange}
        />
        <SelectField
          id="distractions-today"
          label="Distractions today"
          value={distractions}
          disabled={disabled}
          options={[
            ["prefer_not_to_answer", "Prefer not to answer"],
            ["low", "Low"],
            ["medium", "Medium"],
            ["high", "High"],
          ]}
          onChange={onDistractionsChange}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="baseline-notes" className="font-medium">
          Anything that might affect today&apos;s result?
        </label>
        <textarea
          id="baseline-notes"
          value={notes}
          onChange={(event) => onNotesChange(event.currentTarget.value)}
          disabled={disabled}
          suppressHydrationWarning
          className="border-input bg-background min-h-20 w-full rounded-md border px-3 py-2"
        />
      </div>
      <Button type="button" onClick={onSave} disabled={disabled}>
        Save baseline setup
      </Button>
    </section>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled}
        className="border-input bg-background h-9 w-full rounded-md border px-3"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
