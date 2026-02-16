"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BodyPartSelection } from "../types/workout-program";

const MAIN_PARTS = [
  { id: "FULL-BODY" as const, label: "FULL-BODY" },
  { id: "UPPER-BODY" as const, label: "UPPER-BODY" },
  { id: "LOWER-BODY" as const, label: "LOWER-BODY" },
] as const;

const SUPERIOR_PARTS = [
  { id: "ARM" as const, label: "ARM" },
  { id: "SHOULDER" as const, label: "SHOULDER" },
  { id: "CHEST" as const, label: "CHEST" },
  { id: "BACK" as const, label: "BACK" },
] as const;

const POSTERIOR_PARTS = [
  { id: "BACK" as const, label: "BACK" },
  { id: "LEGS" as const, label: "LEGS" },
  { id: "GLUTES" as const, label: "GLUTES" },
  { id: "CORE" as const, label: "CORE" },
] as const;

interface BodyPartCheckboxesProps {
  value: BodyPartSelection;
  onChange: (value: BodyPartSelection) => void;
}

export function BodyPartCheckboxes({ value, onChange }: BodyPartCheckboxesProps) {
  const toggle = (part: keyof BodyPartSelection) => {
    onChange({
      ...value,
      [part]: !value[part],
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase">BODY PART</Label>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {MAIN_PARTS.map(({ id, label }) => (
            <label
              key={id}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <Checkbox
                checked={!!value[id]}
                onCheckedChange={() => toggle(id)}
              />
              <span className="text-sm font-medium">{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-6">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            SUPERIOR
          </Label>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {SUPERIOR_PARTS.map(({ id, label }) => (
              <label
                key={id}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <Checkbox
                  checked={!!value[id]}
                  onCheckedChange={() => toggle(id)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            POSTERIOR
          </Label>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {POSTERIOR_PARTS.map(({ id, label }) => (
              <label
                key={id}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <Checkbox
                  checked={!!value[id]}
                  onCheckedChange={() => toggle(id)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
