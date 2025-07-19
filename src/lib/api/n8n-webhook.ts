/**
 * N8N Webhook API Service
 * Handles direct communication with n8n webhook for invoice synchronization
 */

// TypeScript interfaces for webhook communication
export interface N8nWebhookRequest {
  start_date: string; // Format: YYYY-MM-DD
  end_date: string;   // Format: YYYY-MM-DD
}

export interface N8nWebhookErrorItem {
  name: string;
  error: string;
  status: 'duplicate' | 'failed';
  existing_id?: number;
  existing_date?: string;
}

export interface N8nWebhookSuccessItem {
  name: string;
  id: number;
  status: 'success';
}

export interface N8nWebhookSummary {
  total_files: number;
  success_count: number;
  duplicate_count: number;
  failed_count: number;
}

export interface N8nWebhookData {
  success: N8nWebhookSuccessItem[];
  errors: N8nWebhookErrorItem[];
  folder: string | null;
  summary: N8nWebhookSummary;
}

export interface N8nWebhookResponse {
  code: number;
  message: string;
  data: N8nWebhookData;
}

// Error types for better error handling
export class N8nWebhookError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'N8nWebhookError';
  }
}

export class N8nNetworkError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'N8nNetworkError';
  }
}

// Debug environment variables
console.log('🔧 DEBUG Environment Variables:');
console.log('NEXT_PUBLIC_N8N_WEBHOOK_URL:', process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL);
console.log('NEXT_PUBLIC_N8N_WEBHOOK_URL2:', process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL2);
console.log('All NEXT_PUBLIC env vars:', Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_')));

// Configuration for multiple webhooks
const N8N_WEBHOOK_CONFIGS = {
  nang_vang: {
    url: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://job.nguyenluanbinhthuan.com:8443/webhook/14e8585b-0c07-4b19-b906-005fb97d0bd6',
    name: 'Công ty Nắng Vàng',
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
    }
  },
  nguyen_luan: {
    url: process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL2 || 'https://job.nguyenluanbinhthuan.com:8443/webhook/819d0a94-9a42-4cbf-9291-59f27e7620f3',
    name: 'Công ty Nguyên Luân',
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
    }
  }
};

// Debug final config
console.log('🔧 DEBUG Final webhook configs:');
console.log('Nắng Vàng URL:', N8N_WEBHOOK_CONFIGS.nang_vang.url);
console.log('Nguyên Luân URL:', N8N_WEBHOOK_CONFIGS.nguyen_luan.url);

/**
 * Call n8n webhook to synchronize invoices for a date range
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param company - Company to sync: 'nang_vang' or 'nguyen_luan'
 * @returns Promise<N8nWebhookResponse>
 */
export const syncInvoicesFromN8n = async (
  startDate: string,
  endDate: string,
  company: 'nang_vang' | 'nguyen_luan' = 'nang_vang'
): Promise<N8nWebhookResponse> => {
  try {
    // Validate date format
    if (!isValidDateFormat(startDate) || !isValidDateFormat(endDate)) {
      throw new N8nWebhookError('Invalid date format. Expected YYYY-MM-DD');
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      throw new N8nWebhookError('Start date cannot be after end date');
    }

    // Get config for selected company
    const config = N8N_WEBHOOK_CONFIGS[company];
    if (!config) {
      throw new N8nWebhookError(`Invalid company: ${company}`);
    }

    const requestPayload: N8nWebhookRequest = {
      start_date: startDate,
      end_date: endDate
    };

    console.log(`Calling n8n webhook for ${config.name} with payload:`, requestPayload);
    console.log('N8n webhook URL:', config.url);
    console.log('Request headers:', config.headers);

    // No timeout for n8n webhook - allow long-running operations
    const response = await fetch(config.url, {
      method: 'POST',
      headers: config.headers,
      body: JSON.stringify(requestPayload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get response text first to debug and handle empty responses
    const responseText = await response.text();
    console.log('Raw n8n webhook response:', responseText);
    console.log('Response status:', response.status, response.statusText);

    // Handle HTTP errors
    if (!response.ok) {
      throw new N8nWebhookError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        responseText || 'Unknown error'
      );
    }

    // Check if response is empty - this is valid when no invoices to process
    if (!responseText || responseText.trim() === '' || responseText.trim() === '{}') {
      console.log('Empty response from n8n - no invoices to process');
      // Return a default response structure for empty results
      return {
        code: 200,
        message: 'No invoices found in the specified date range',
        data: {
          success: [],
          errors: [],
          folder: null,
          summary: {
            total_files: 0,
            success_count: 0,
            duplicate_count: 0,
            failed_count: 0
          }
        }
      };
    }

    // Try to parse JSON
    let data: N8nWebhookResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response text:', responseText);

      // Check if it's HTML (error page)
      if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
        throw new N8nWebhookError('Received HTML response instead of JSON (possible server error)');
      }

      throw new N8nWebhookError(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }

    console.log('Parsed n8n webhook response:', data);

    // Validate response structure
    if (!isValidN8nResponse(data)) {
      throw new N8nWebhookError('Invalid response format from n8n webhook');
    }

    return data;

  } catch (error) {
    console.error('Error calling n8n webhook:', error);

    // Handle different error types
    if (error instanceof N8nWebhookError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new N8nNetworkError('Network error: Unable to connect to n8n webhook', error);
    }

    // Generic error fallback
    throw new N8nWebhookError(
      `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDateFormat(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate n8n webhook response structure
 */
function isValidN8nResponse(data: any): data is N8nWebhookResponse {
  return (
    data &&
    typeof data.code === 'number' &&
    typeof data.message === 'string' &&
    data.data &&
    Array.isArray(data.data.success) &&
    Array.isArray(data.data.errors) &&
    data.data.summary &&
    typeof data.data.summary.total_files === 'number' &&
    typeof data.data.summary.success_count === 'number' &&
    typeof data.data.summary.duplicate_count === 'number' &&
    typeof data.data.summary.failed_count === 'number'
  );
}

/**
 * Test webhook connectivity
 * @param company - Company to test: 'nang_vang' or 'nguyen_luan'
 */
export const testWebhookConnectivity = async (company: 'nang_vang' | 'nguyen_luan' = 'nang_vang'): Promise<boolean> => {
  try {
    const config = N8N_WEBHOOK_CONFIGS[company];
    if (!config) {
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(config.url, {
      method: 'HEAD', // Just check if endpoint exists
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('Webhook connectivity test - Status:', response.status);

    return response.status < 500; // Accept any non-server-error status
  } catch (error) {
    console.error('Webhook connectivity test failed:', error);
    return false;
  }
};

/**
 * Get available companies for webhook selection
 */
export const getAvailableCompanies = () => {
  return Object.entries(N8N_WEBHOOK_CONFIGS).map(([key, config]) => ({
    value: key as 'nang_vang' | 'nguyen_luan',
    label: config.name
  }));
};

/**
 * Format webhook response for user display
 */
export const formatWebhookResult = (response: N8nWebhookResponse): string => {
  const { summary } = response.data;
  
  if (summary.total_files === 0) {
    return 'Không tìm thấy hóa đơn nào trong khoảng thời gian đã chọn.';
  }

  const parts = [];
  
  if (summary.success_count > 0) {
    parts.push(`${summary.success_count} hóa đơn mới`);
  }
  
  if (summary.duplicate_count > 0) {
    parts.push(`${summary.duplicate_count} hóa đơn trùng lặp`);
  }
  
  if (summary.failed_count > 0) {
    parts.push(`${summary.failed_count} hóa đơn lỗi`);
  }

  return `Đã xử lý ${summary.total_files} hóa đơn: ${parts.join(', ')}.`;
};

/**
 * Get detailed error messages from webhook response
 */
export const getWebhookErrorDetails = (response: N8nWebhookResponse): string[] => {
  return response.data.errors.map(error => {
    if (error.status === 'duplicate') {
      return `${error.name}: ${error.error}`;
    }
    return `${error.name}: ${error.error}`;
  });
};
