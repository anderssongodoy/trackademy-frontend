export interface GoogleCredentialResponse {
  credential: string;
}

export interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
  prompt(): void;
}

export interface GoogleApi {
  accounts: {
    id: GoogleAccountsId;
  };
}
