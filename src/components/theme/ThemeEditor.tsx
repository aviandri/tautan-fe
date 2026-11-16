"use client";

import type { Theme } from "@/lib/types";
import { ThemePicker } from "./ThemePicker";
import { ThemeCustomizer } from "./ThemeCustomizer";

export interface ThemeEditorProps {
  value: Theme;
  onChange: (theme: Theme) => void;
  onUploadImage?: (file: File) => Promise<string>;
}

/** Presets on top, advanced overrides below. Controlled: the dashboard owns saving. */
export function ThemeEditor({ value, onChange, onUploadImage }: ThemeEditorProps) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Themes</h3>
        <ThemePicker value={value} onChange={onChange} />
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">Customise</h3>
        <ThemeCustomizer value={value} onChange={onChange} onUploadImage={onUploadImage} />
      </section>
    </div>
  );
}
