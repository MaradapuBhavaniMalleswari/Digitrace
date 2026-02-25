import { useState, useEffect, useCallback, useRef } from 'react';
import forensicsAPI, { ExtractionStatus, DeviceStatus, ExtractionSummary } from '../services/forensicsAPI';

// Hook for device status
export const useDeviceStatus = () => {
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await forensicsAPI.getDeviceStatus();
      setDeviceStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check device status');
      setDeviceStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { deviceStatus, loading, error, refetch: checkStatus };
};

// Hook for managing a single extraction
export const useExtraction = (jobId?: string) => {
  const [status, setStatus] = useState<ExtractionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async (id: string) => {
    try {
      setError(null);
      const extractionStatus = await forensicsAPI.getExtractionStatus(id);
      setStatus(extractionStatus);
      return extractionStatus;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch extraction status');
      return null;
    }
  }, []);

  const startPolling = useCallback((id: string, interval: number = 5000) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      const currentStatus = await fetchStatus(id);
      if (currentStatus && (currentStatus.status === 'completed' || currentStatus.status === 'failed')) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, interval);
  }, [fetchStatus]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startExtraction = useCallback(async (caseName: string = 'case') => {
    try {
      setLoading(true);
      setError(null);
      const result = await forensicsAPI.startExtraction(caseName);
      
      // Start polling for status updates
      startPolling(result.job_id);
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start extraction');
      return null;
    } finally {
      setLoading(false);
    }
  }, [startPolling]);

  const deleteExtraction = useCallback(async (id: string) => {
    try {
      setError(null);
      await forensicsAPI.deleteExtraction(id);
      if (status?.job_id === id) {
        setStatus(null);
      }
      stopPolling();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete extraction');
      return false;
    }
  }, [status, stopPolling]);

  useEffect(() => {
    if (jobId) {
      fetchStatus(jobId);
    }
  }, [jobId, fetchStatus]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    loading,
    error,
    startExtraction,
    deleteExtraction,
    startPolling,
    stopPolling,
    refetch: jobId ? () => fetchStatus(jobId) : undefined,
  };
};

// Hook for listing all extractions
export const useExtractionList = () => {
  const [extractions, setExtractions] = useState<ExtractionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExtractions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await forensicsAPI.listExtractions();
      setExtractions(result.extractions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch extractions');
      setExtractions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExtractions();
  }, [fetchExtractions]);

  return { extractions, loading, error, refetch: fetchExtractions };
};

// Hook for extraction data
export const useExtractionData = (jobId?: string) => {
  const [summary, setSummary] = useState<ExtractionSummary | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<Record<string, any> | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [sms, setSms] = useState<any[]>([]);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (id: string) => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      // Load all data in parallel
      const [
        summaryData,
        deviceData,
        packagesData,
        contactsData,
        smsData,
        callLogsData,
        mediaData,
      ] = await Promise.allSettled([
        forensicsAPI.getExtractionSummary(id),
        forensicsAPI.getDeviceInfo(id),
        forensicsAPI.getPackages(id),
        forensicsAPI.getContacts(id),
        forensicsAPI.getSMS(id),
        forensicsAPI.getCallLogs(id),
        forensicsAPI.getMedia(id),
      ]);

      // Update state with successful results
      if (summaryData.status === 'fulfilled') setSummary(summaryData.value);
      if (deviceData.status === 'fulfilled') setDeviceInfo(deviceData.value.device_info);
      if (packagesData.status === 'fulfilled') setPackages(packagesData.value.packages);
      if (contactsData.status === 'fulfilled') setContacts(contactsData.value.contacts);
      if (smsData.status === 'fulfilled') setSms(smsData.value.sms);
      if (callLogsData.status === 'fulfilled') setCallLogs(callLogsData.value.call_logs);
      if (mediaData.status === 'fulfilled') setMedia(mediaData.value.media);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load extraction data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (jobId) {
      loadData(jobId);
    }
  }, [jobId, loadData]);

  return {
    summary,
    deviceInfo,
    packages,
    contacts,
    sms,
    callLogs,
    media,
    loading,
    error,
    refetch: jobId ? () => loadData(jobId) : undefined,
  };
};

// Hook for system information
export const useSystemInfo = () => {
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorageInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await forensicsAPI.getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch storage info');
    } finally {
      setLoading(false);
    }
  }, []);

  const cleanup = useCallback(async () => {
    try {
      setError(null);
      const result = await forensicsAPI.cleanupOldExtractions();
      await fetchStorageInfo(); // Refresh storage info
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup extractions');
      return null;
    }
  }, [fetchStorageInfo]);

  useEffect(() => {
    fetchStorageInfo();
  }, [fetchStorageInfo]);

  return { storageInfo, loading, error, cleanup, refetch: fetchStorageInfo };
};