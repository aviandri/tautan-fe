/**
 * Interactive P3-C/D cards and gate unlocks (owned by tautan-27; placeholder until its PR lands).
 * Called by runtime-core for `submit`/`input` events inside [data-x] elements, and once on start
 * when the page has [data-x-lock] stubs. ctx.preview is true in the editor: don't POST then.
 */
export interface P3cdContext {
  username: string;
  preview: boolean;
  root: HTMLElement;
}

export function run(...args: [e: Event, el: HTMLElement, ctx: P3cdContext]): void {
  void args;
}

export function restore(...args: [root: HTMLElement, ctx: P3cdContext]): void {
  void args;
}
