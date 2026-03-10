import { Injectable } from '@angular/core';

import { AppEnvironment } from './app-environment';

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private config: Partial<AppEnvironment> | null = null;

  async load(): Promise<void> {
    try {
      const response = await fetch('/assets/config.json', { cache: 'no-store' });
      if (response.ok) {
        this.config = await response.json();
      }
    } catch {
      this.config = null;
    }
  }

  apply(base: AppEnvironment): AppEnvironment {
    if (!this.config) {
      return base;
    }
    return {
      ...base,
      ...this.config
    } as AppEnvironment;
  }
}