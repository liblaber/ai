// Typed API client for onboarding endpoints

import {
  type OnboardingRequest,
  type OnboardingCompleteResponse,
  type OnboardingStatusResponse,
  type OnboardingStepResponse,
  type AuthStepRequest,
  type AuthConfigStepRequest,
  type LlmStepRequest,
  type DatasourceStepRequest,
  type UsersStepRequest,
  validateOnboardingCompleteResponse,
  validateOnboardingStatusResponse,
  validateOnboardingStepResponse,
} from '~/types/onboarding';

export class OnboardingApiClient {
  private _baseUrl: string;

  constructor(baseUrl: string = '') {
    this._baseUrl = baseUrl;
  }

  /**
   * Check if the application has been set up
   */
  async checkStatus(): Promise<OnboardingStatusResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStatusResponse(data)) {
      throw new Error('Invalid response format from onboarding status API');
    }

    return data;
  }

  /**
   * Complete the onboarding process
   */
  async completeOnboarding(request: OnboardingRequest): Promise<OnboardingCompleteResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingCompleteResponse(data)) {
      throw new Error('Invalid response format from onboarding complete API');
    }

    return data;
  }

  /**
   * Save auth step progress
   */
  async saveAuthStep(request: AuthStepRequest): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from auth step API');
    }

    return data;
  }

  /**
   * Save auth-config step progress
   */
  async saveAuthConfigStep(request: AuthConfigStepRequest): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/auth-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from auth-config step API');
    }

    return data;
  }

  /**
   * Save LLM step progress
   */
  async saveLlmStep(request: LlmStepRequest): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from LLM step API');
    }

    return data;
  }

  /**
   * Save datasource step progress
   */
  async saveDatasourceStep(request: DatasourceStepRequest): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/datasource`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from datasource step API');
    }

    return data;
  }

  /**
   * Save users step progress
   */
  async saveUsersStep(request: UsersStepRequest): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from users step API');
    }

    return data;
  }

  /**
   * Get current auth step progress
   */
  async getAuthStep(): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/auth`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from auth step API');
    }

    return data;
  }

  /**
   * Get current auth-config step progress
   */
  async getAuthConfigStep(): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/auth-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from auth-config step API');
    }

    return data;
  }

  /**
   * Get current LLM step progress
   */
  async getLlmStep(): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/llm`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from LLM step API');
    }

    return data;
  }

  /**
   * Get current datasource step progress
   */
  async getDatasourceStep(): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/datasource`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from datasource step API');
    }

    return data;
  }

  /**
   * Get current users step progress
   */
  async getUsersStep(): Promise<OnboardingStepResponse> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!validateOnboardingStepResponse(data)) {
      throw new Error('Invalid response format from users step API');
    }

    return data;
  }

  /**
   * Validate Google OAuth credentials
   */
  async validateGoogleOAuth(credentials: {
    clientId: string;
    clientSecret: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/validate-google-oauth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      // 'data' is of type 'unknown', so we need to safely extract error message
      let errorMsg = `HTTP error! status: ${response.status}`;

      if (data && typeof data === 'object' && 'error' in data && typeof (data as any).error === 'string') {
        errorMsg = (data as any).error;
      }

      throw new Error(errorMsg);
    }

    // Ensure the returned data matches the expected type
    if (!data || typeof data !== 'object' || typeof (data as any).success !== 'boolean') {
      throw new Error('Invalid response format from validateGoogleOAuth API');
    }

    return data as { success: boolean; error?: string; message?: string };
  }

  /**
   * Get Google user info using authorization code
   */
  async getGoogleUserInfo(request: { code: string; clientId: string; clientSecret: string }): Promise<{
    success: boolean;
    user?: { name: string; email: string; picture?: string; id: string };
    error?: string;
  }> {
    const response = await fetch(`${this._baseUrl}/api/onboarding/google-user-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = (await response.json()) as {
      success: boolean;
      user?: { name: string; email: string; picture?: string; id: string };
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }
}

// Cache utility for clearing onboarding status cache
export const clearOnboardingStatusCache = (): void => {
  try {
    localStorage.removeItem('onboarding_status');
  } catch (error) {
    console.error('Error clearing onboarding status cache:', error);
  }
};

// Default instance for use in components
export const onboardingApi = new OnboardingApiClient();
