import type { JsonValue } from "@/lib/local";
import type { QuestionnaireQuestion } from "@/lib/questionnaires";

export function QuestionField({
  question,
  value,
  error,
  disabled,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: JsonValue | undefined;
  error: string | undefined;
  disabled: boolean;
  onChange: (value: JsonValue | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={question.questionId} className="font-medium">
        {question.label}
      </label>
      <QuestionControl
        question={question}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
      {error && <p className="text-destructive">{error}</p>}
      <p className="text-muted-foreground">{question.researchPurpose}</p>
    </div>
  );
}

function QuestionControl({
  question,
  value,
  disabled,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: JsonValue | undefined;
  disabled: boolean;
  onChange: (value: JsonValue | undefined) => void;
}) {
  if (question.type === "single_choice") {
    return (
      <SingleChoice
        question={question}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }
  if (question.type === "multi_choice") {
    return (
      <MultiChoice
        question={question}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }
  return (
    <InputQuestion
      question={question}
      value={value}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

function SingleChoice({
  question,
  value,
  disabled,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: JsonValue | undefined;
  disabled: boolean;
  onChange: (value: JsonValue | undefined) => void;
}) {
  return (
    <select
      id={question.questionId}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(event.currentTarget.value)}
      disabled={disabled}
      className="border-input bg-background h-9 w-full rounded-md border px-3"
    >
      <PreferNotToSayOption question={question} />
      {question.options?.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function MultiChoice({
  question,
  value,
  disabled,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: JsonValue | undefined;
  disabled: boolean;
  onChange: (value: JsonValue | undefined) => void;
}) {
  const values = Array.isArray(value) ? value.map(String) : [];
  return (
    <fieldset
      id={question.questionId}
      className="border-input rounded-md border p-2"
    >
      <legend className="sr-only">{question.label}</legend>
      {[preferNotOption(question), ...(question.options ?? [])]
        .filter((option): option is { value: string; label: string } =>
          Boolean(option),
        )
        .map((option) => (
          <label key={option.value} className="flex gap-2 py-1">
            <input
              type="checkbox"
              checked={values.includes(option.value)}
              disabled={disabled}
              onChange={(event) => {
                const next = new Set(values);
                if (event.currentTarget.checked) {
                  if (option.value === "prefer_not_to_say") {
                    onChange(["prefer_not_to_say"]);
                    return;
                  }
                  next.delete("prefer_not_to_say");
                  next.add(option.value);
                } else {
                  next.delete(option.value);
                }
                onChange(Array.from(next));
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
    </fieldset>
  );
}

function InputQuestion({
  question,
  value,
  disabled,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: JsonValue | undefined;
  disabled: boolean;
  onChange: (value: JsonValue | undefined) => void;
}) {
  const preferNot = value === "prefer_not_to_say";
  const type = question.type === "text_short" ? "text" : "number";
  return (
    <div className="space-y-1">
      <input
        id={question.questionId}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        min={question.min}
        max={question.max}
        step={question.step}
        value={preferNot || value === undefined ? "" : String(value)}
        onChange={(event) =>
          onChange(inputValue(question, event.currentTarget.value))
        }
        disabled={disabled || preferNot}
        className="border-input bg-background h-9 w-full rounded-md border px-3"
      />
      {question.allowsPreferNotToSay && (
        <label className="text-muted-foreground flex gap-2">
          <input
            type="checkbox"
            checked={preferNot}
            disabled={disabled}
            onChange={(event) =>
              onChange(
                event.currentTarget.checked ? "prefer_not_to_say" : undefined,
              )
            }
          />
          <span>Prefer not to say for {question.label}</span>
        </label>
      )}
    </div>
  );
}

function PreferNotToSayOption({
  question,
}: {
  question: QuestionnaireQuestion;
}) {
  const option = preferNotOption(question);
  if (!option) return null;
  return <option value={option.value}>{option.label}</option>;
}

function preferNotOption(question: QuestionnaireQuestion) {
  if (!question.allowsPreferNotToSay) return null;
  return { value: "prefer_not_to_say", label: "Prefer not to say" };
}

function inputValue(question: QuestionnaireQuestion, value: string) {
  if (value === "") return undefined;
  if (["number", "scale"].includes(question.type)) return Number(value);
  return value;
}
