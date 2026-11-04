export type Result = { ok: boolean; message: string; data?: unknown };
export type Args = Record<string, unknown>;
export type Context = {
  run(tool: string, command: string, args?: Args): Promise<Result>;
  snapshot(): unknown;
  close(): void;
};
export type Tool = {
  id: string;
  label: string;
  scope: string;
  commands: readonly string[];
  available(): string | null;
  run(command: string, args: Args): Result | Promise<Result>;
  mount(parent: HTMLElement, context: Context): (() => void) | Promise<() => void>;
  snapshot?(): unknown;
};
export type DevApi = {
  tools(): { id: string; label: string; scope?: string; commands?: readonly string[] }[];
  open(tool?: string): Promise<boolean>;
  run(tool: string, command: string, args?: Args): Promise<Result>;
  snapshot(): unknown;
  close(): void;
};
export const ok = (message: string, data?: unknown): Result => ({ ok: true, message, data });
export const no = (message: string): Result => ({ ok: false, message });
