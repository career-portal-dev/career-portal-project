import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { DynamicField } from "@/data/jobs";
import { useI18n, type Localized } from "@/lib/i18n";
import { languageLabel } from "@/lib/language-config";

type QuestionType = DynamicField["type"];

const typeLabels: Record<QuestionType, Localized> = {
  text: { vi: "Văn bản ngắn", en: "Short text" },
  url: { vi: "Đường dẫn", en: "Link / URL" },
  textarea: { vi: "Văn bản dài", en: "Long text" },
  select: { vi: "Danh sách chọn", en: "Dropdown" },
};

const questionTypes = Object.keys(typeLabels) as QuestionType[];

export function newJobQuestion(): DynamicField {
  return {
    id: `q_${Math.random().toString(36).slice(2, 8)}`,
    label: { vi: "", en: "" },
    type: "text",
    required: false,
  };
}

/** Returns a bilingual error message when a question cannot be saved, otherwise null. */
export function jobQuestionError(questions: DynamicField[]): Localized | null {
  for (const [index, question] of questions.entries()) {
    const n = index + 1;
    if (!question.label.vi.trim() && !question.label.en.trim()) {
      return { vi: `Câu hỏi riêng #${n} chưa có nội dung.`, en: `Role question #${n} has no text.` };
    }
    const hasOption = question.options?.some((option) => option.vi.trim() || option.en.trim());
    if (question.type === "select" && !hasOption) {
      return {
        vi: `Câu hỏi riêng #${n} cần ít nhất một lựa chọn.`,
        en: `Role question #${n} needs at least one option.`,
      };
    }
  }
  return null;
}

function LocalizedPair({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Localized;
  onChange: (next: Localized) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(["vi", "en"] as const).map((language) => (
        <Input
          key={language}
          value={value[language] ?? ""}
          placeholder={languageLabel(language)}
          aria-label={`${label} — ${languageLabel(language)}`}
          onChange={(event) => onChange({ ...value, [language]: event.target.value })}
        />
      ))}
    </div>
  );
}

/**
 * Editor for the questions a candidate answers only when applying to this job. They are
 * appended to the apply-form section that has "role-specific questions" turned on.
 */
export function JobQuestionsEditor({
  value,
  onChange,
}: {
  value: DynamicField[];
  onChange: (next: DynamicField[]) => void;
}) {
  const { tr } = useI18n();

  const update = (index: number, patch: Partial<DynamicField>) =>
    onChange(value.map((question, i) => (i === index ? { ...question, ...patch } : question)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {tr({
          vi: "Ứng viên chỉ thấy các câu hỏi này khi ứng tuyển vị trí này. Câu hỏi được thêm vào phần có bật “Tự động thêm câu hỏi riêng của từng vị trí” trong Biểu mẫu ứng tuyển.",
          en: "Candidates see these questions only when applying for this job. They are added to the application-form section with “Automatically append role-specific questions” turned on.",
        })}
      </p>

      {value.map((question, index) => {
        const questionLabel = tr({ vi: `Câu hỏi ${index + 1}`, en: `Question ${index + 1}` });
        return (
          <div key={question.id} className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{questionLabel}</p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === 0}
                  aria-label={tr({ vi: "Chuyển lên", en: "Move up" })}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={index === value.length - 1}
                  aria-label={tr({ vi: "Chuyển xuống", en: "Move down" })}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label={tr({ vi: "Xóa câu hỏi", en: "Delete question" })}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{tr({ vi: "Nội dung câu hỏi", en: "Question text" })}</Label>
              <LocalizedPair
                label={questionLabel}
                value={question.label}
                onChange={(label) => update(index, { label })}
              />
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${question.id}-type`}>{tr({ vi: "Loại câu trả lời", en: "Answer type" })}</Label>
                <Select
                  value={question.type}
                  onValueChange={(type) => {
                    const nextType = type as QuestionType;
                    update(index, {
                      type: nextType,
                      ...(nextType === "select" && !question.options?.length
                        ? { options: [{ vi: "", en: "" }] }
                        : {}),
                    });
                  }}
                >
                  <SelectTrigger id={`${question.id}-type`} className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {tr(typeLabels[type])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex h-10 items-center gap-2 text-sm">
                <Switch
                  checked={question.required}
                  onCheckedChange={(required) => update(index, { required })}
                />
                {tr({ vi: "Bắt buộc", en: "Required" })}
              </label>
            </div>

            {question.type === "select" && (
              <div className="space-y-2">
                <Label>{tr({ vi: "Các lựa chọn", en: "Options" })}</Label>
                {(question.options ?? []).map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <LocalizedPair
                        label={tr({ vi: `Lựa chọn ${optionIndex + 1}`, en: `Option ${optionIndex + 1}` })}
                        value={option}
                        onChange={(nextOption) =>
                          update(index, {
                            options: (question.options ?? []).map((item, i) =>
                              i === optionIndex ? nextOption : item,
                            ),
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={tr({ vi: "Xóa lựa chọn", en: "Remove option" })}
                      onClick={() =>
                        update(index, {
                          options: (question.options ?? []).filter((_, i) => i !== optionIndex),
                        })
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    update(index, { options: [...(question.options ?? []), { vi: "", en: "" }] })
                  }
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {tr({ vi: "Thêm lựa chọn", en: "Add option" })}
                </Button>
              </div>
            )}
          </div>
        );
      })}

      <Button type="button" variant="outline" onClick={() => onChange([...value, newJobQuestion()])}>
        <Plus className="mr-1.5 h-4 w-4" />
        {tr({ vi: "Thêm câu hỏi", en: "Add question" })}
      </Button>
    </div>
  );
}
