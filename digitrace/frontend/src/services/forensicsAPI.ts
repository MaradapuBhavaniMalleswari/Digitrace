// API service for Digital Forensics backend
const API_BASE_URL = 'http://localhost:8001';

export interface DeviceInfo {
  manufacturer: string;
  model: string;
  android_version: string;
  serial_number: string;
  build_info: Record<string, any>;
}

export interface ExtractionStatus {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  created_at: string;
  completed_at?: string;
  export_dir?: string;
  error?: string;
}

export interface ExtractionSummary {
  job_id: string;
  created: string;
  device_info: Record<string, any>;
  artifacts: Array<[string, string]>;
  files_count: number;
  total_size: number;
}

export interface Package {
  package: string;
  apk_path: string;
}

export interface MediaFile {
  filename: string;
  size: number;
  path: string;
}

export interface Contact {
  [key: string]: any;
}

export interface SMSMessage {
  [key: string]: any;
}

export interface CallLog {
  [key: string]: any;
}

export interface DeviceStatus {
  connected: boolean;
  devices: Array<{serial: string; status: string}>;
  connected_devices: Array<{serial: string; status: string}>;
  error?: string;
}

class ForensicsAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Health and Status
  async getHealth(): Promise<{status: string; adb_status: string; timestamp: string}> {
    return this.request('/health');
  }

  async getDeviceStatus(): Promise<DeviceStatus> {
    return this.request('/api/device/status');
  }

  // Extraction Management
  async startExtraction(caseName: string = 'case'): Promise<{job_id: string; message: string; status: string}> {
    return this.request('/api/extract', {
      method: 'POST',
      body: JSON.stringify({ case_name: caseName }),
    });
  }

  async getExtractionStatus(jobId: string): Promise<ExtractionStatus> {
    return this.request(`/api/extract/${jobId}/status`);
  }

  async listExtractions(): Promise<{extractions: ExtractionStatus[]; total: number}> {
    return this.request('/api/extractions');
  }

  async deleteExtraction(jobId: string): Promise<{message: string}> {
    return this.request(`/api/extract/${jobId}`, {
      method: 'DELETE',
    });
  }

  // Data Retrieval
  async getDeviceInfo(jobId: string): Promise<{device_info: Record<string, any>}> {
    return this.request(`/api/extract/${jobId}/device-info`);
  }

  async getPackages(jobId: string): Promise<{packages: Package[]; total: number}> {
    return this.request(`/api/extract/${jobId}/packages`);
  }

  async getContacts(jobId: string): Promise<{contacts: Contact[]; total: number; message?: string}> {
    return this.request(`/api/extract/${jobId}/contacts`);
  }

  async getSMS(jobId: string): Promise<{sms: SMSMessage[]; total: number; message?: string}> {
    return this.request(`/api/extract/${jobId}/sms`);
  }

  async getCallLogs(jobId: string): Promise<{call_logs: CallLog[]; total: number; message?: string}> {
    return this.request(`/api/extract/${jobId}/call-logs`);
  }

  async getMedia(jobId: string): Promise<{media: MediaFile[]; total: number; message?: string}> {
    return this.request(`/api/extract/${jobId}/media`);
  }

  async getExtractionSummary(jobId: string): Promise<ExtractionSummary> {
    return this.request(`/api/extract/${jobId}/summary`);
  }

  // File Access
  getMediaFileUrl(jobId: string, filename: string): string {
    return `${this.baseUrl}/api/extract/${jobId}/media/${filename}`;
  }

  getFileUrl(jobId: string, filepath: string): string {
    return `${this.baseUrl}/api/extract/${jobId}/files/${filepath}`;
  }

  getDownloadUrl(jobId: string): string {
    return `${this.baseUrl}/api/extract/${jobId}/download`;
  }

  getReportUrl(jobId: string): string {
    return `${this.baseUrl}/api/extract/${jobId}/report`;
  }

  // System Management
  async getStorageInfo(): Promise<{
    total_extractions: number;
    total_size: number;
    available_space: number | string;
    exports_directory: string;
  }> {
    return this.request('/api/system/storage');
  }

  async cleanupOldExtractions(): Promise<{message: string; cleaned: number}> {
    return this.request('/api/system/cleanup', {
      method: 'POST',
    });
  }
}

export const forensicsAPI = new ForensicsAPI();
export default forensicsAPI;