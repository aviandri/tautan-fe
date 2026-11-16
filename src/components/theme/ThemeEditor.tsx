"use client";

import type { Theme } from "@/lib/types";
import { getPreset, hasOverrides } from "@/lib/theme/presets";
import { ThemePicker } from "./ThemePicker";
import { Group, ThemeCustomizer } from "./ThemeCustomizer";

export interface ThemeEditorProps {
  value: Theme;
  onChange: (theme: Theme) => void;
  onUploadImage?: (file: File) => Promise<string>;
}

/**
 * Kartu "Design" groups: the theme row across the top, then header, fonts, buttons, colours and more.
 * Renders grid items; the parent supplies the 2-column grid (and can add its own groups after).
 * Controlled: the dashboard owns saving.
 */
export function ThemeEditor({ value, onChange, onUploadImage }: ThemeEditorProps) {
  const name = getPreset(value.preset).name;
  return (
    <>
      <Group title="Theme" wide action={<span className="text-sm font-semibold text-muted">{hasOverrides(value) ? `${name}, with your changes` : name}</span>}>
        <ThemePicker value={value} onChange={onChange} variant="row" />
      </Group>
      <ThemeCustomizer value={value} onChange={onChange} onUploadImage={onUploadImage} />
    </>
  );
}
