import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DynamicField } from "@/data/jobs";
import { fromDynamicField, useFormConfig, type FormField } from "@/lib/form-config";
import { useI18n } from "@/lib/i18n";

type Answers = Record<string, string | boolean>;

/** Field ids the dialog header already shows (name, contact details, address). */
const HEADER_FIELD_IDS = new Set(["fullname", "name", "email", "phone", "city", "address"]);

/**
 * True for fields not listed in the dialog: those already shown elsewhere (header or CV
 * block) and the storage consent checkbox.
 */
function isShownElsewhere(field: FormField): boolean {
  const id = field.id.toLowerCase();
  if (id === "consent") return true;
  if (field.type === "file" || field.type === "email" || field.type === "tel") return true;
  if (HEADER_FIELD_IDS.has(id)) return true;
  return field.type === "text" && (id.includes("name") || id.includes("address"));
}

/** Inputs look like the other form inputs; they are only made read-only. */
const readOnlyClass = "cursor-default";

/**
 * A candidate's apply-form answers laid out like the apply form (label above a read-only
 * input), including questions added in the form builder. `part="first"` renders the
 * first section (personal information, placed above the CV block); `part="rest"` renders
 * every later section in order. Fields the dialog already shows (name, contact details,
 * address, uploaded files) are skipped.
 */
export function CandidateFormFields({
  candidateId,
  answers,
  part,
  jobFields = [],
}: {
  candidateId: string;
  answers: Answers | undefined;
  part: "first" | "rest";
  /** Role-specific questions of the job the candidate applied to. */
  jobFields?: DynamicField[];
}) {
  const { tr } = useI18n();
  const { formConfig } = useFormConfig();

  // Same as the apply page: role questions join the section that includes job fields.
  const sections = formConfig.sections.map((section) =>
    section.includeJobFields
      ? [...section.fields, ...jobFields.map(fromDynamicField)]
      : section.fields,
  );
  const partSections = part === "first" ? sections.slice(0, 1) : sections.slice(1);
  const fields = partSections.flat().filter((field) => !isShownElsewhere(field));
  if (fields.length === 0) return null;

  const textOf = (field: FormField): string => {
    const raw = answers?.[field.id];
    const text = typeof raw === "string" ? raw.trim() : "";
    if (field.type === "select" && text) {
      const option = field.options?.find((item) => item.en === text || item.vi === text);
      return option ? tr(option) : text;
    }
    return text;
  };

  const renderField = (field: FormField) => {
    const inputId = `candidate-${candidateId}-${field.id}`;

    if (field.type === "checkbox") {
      return (
        <div className="flex items-start gap-3">
          <Checkbox id={inputId} checked={answers?.[field.id] === true} disabled />
          <Label htmlFor={inputId} className="text-sm font-normal leading-snug peer-disabled:opacity-100">
            {tr(field.label)}
          </Label>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={inputId}>{tr(field.label)}</Label>
        {field.type === "textarea" ? (
          <Textarea
            id={inputId}
            rows={4}
            readOnly
            value={textOf(field)}
            placeholder="—"
            className={readOnlyClass}
          />
        ) : (
          <Input id={inputId} readOnly value={textOf(field)} placeholder="—" className={readOnlyClass} />
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.id} className={field.fullWidth ? "sm:col-span-2" : undefined}>
          {renderField(field)}
        </div>
      ))}
    </div>
  );
}
