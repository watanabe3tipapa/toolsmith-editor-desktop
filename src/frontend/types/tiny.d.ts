export {};

type TinyMenuItem = {
  id?: string;
  label?: string;
  title?: string;
  key?: string;
  role?: string;
  checked?: boolean;
  enabled?: boolean;
  separator?: boolean;
  standard?: boolean;
  items?: TinyMenuItem[];
  submenu?: TinyMenuItem[];
};

declare global {
  interface Window {
    tiny?: {
      api: {
        call<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
        on(event: string, handler: (payload: unknown) => void): () => void;
      };
      dialog: {
        pickFolder(): Promise<string | null>;
        saveFile(options?: { types?: string[]; name?: string }): Promise<string | null>;
        prompt(message: string, options?: { default?: string; ok?: string; cancel?: string }): Promise<string | null>;
        confirm(message: string, options?: { detail?: string; ok?: string; cancel?: string }): Promise<boolean>;
        alert(message: string, options?: { detail?: string; ok?: string }): Promise<void>;
      };
      menu: {
        set(items: TinyMenuItem[]): void;
        on(handler: (id: string) => void): () => void;
      };
      store: {
        get<T = unknown>(key: string): Promise<T | null>;
        set(key: string, value: unknown): Promise<boolean>;
      };
      win: {
        setTitle(title: string): void;
        onDrop(handler: (paths: string[]) => void): () => void;
      };
    };
  }
}
