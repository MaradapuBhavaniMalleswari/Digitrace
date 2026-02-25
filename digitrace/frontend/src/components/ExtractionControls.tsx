import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Download, Eye, Trash2, RefreshCw } from 'lucide-react';
import { useDeviceStatus, useExtraction } from '../hooks/useForensics';
import forensicsAPI from '../services/forensicsAPI';

interface ExtractionControlsProps {
  onExtractionStart?: (jobId: string) => void;
  onExtractionComplete?: (jobId: string) => void;
}

export const ExtractionControls: React.FC<ExtractionControlsProps> = ({
  onExtractionStart,
  onExtractionComplete,
}) => {
  const [caseName, setCaseName] = useState('');
  const { deviceStatus, loading: deviceLoading, error: deviceError, refetch } = useDeviceStatus();
  const { status, loading, error, startExtraction, deleteExtraction } = useExtraction();

  const handleStartExtraction = async () => {
    const result = await startExtraction(caseName || 'case');
    if (result?.job_id) {
      onExtractionStart?.(result.job_id);
    }
  };

  const handleDeleteExtraction = async () => {
    if (status?.job_id) {
      await deleteExtraction(status.job_id);
    }
  };

  const getStatusColor = (extractionStatus: string) => {
    switch (extractionStatus) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  React.useEffect(() => {
    if (status?.status === 'completed' && status.job_id) {
      onExtractionComplete?.(status.job_id);
    }
  }, [status?.status, status?.job_id, onExtractionComplete]);

  return (
    <div className="space-y-6">
      {/* Device Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Device Connection
            <Button variant="ghost" size="sm" onClick={refetch} disabled={deviceLoading}>
              <RefreshCw className={`h-4 w-4 ${deviceLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>Check ADB device connection status</CardDescription>
        </CardHeader>
        <CardContent>
          {deviceLoading && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking device connection...</span>
            </div>
          )}
          
          {deviceError && (
            <Alert variant="destructive">
              <AlertDescription>{deviceError}</AlertDescription>
            </Alert>
          )}
          
          {deviceStatus && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={deviceStatus.connected ? "default" : "secondary"}>
                  {deviceStatus.connected ? "Connected" : "Disconnected"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {deviceStatus.connected_devices?.length || 0} device(s)
                </span>
              </div>
              
              {deviceStatus.connected_devices?.map((device, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{device.serial}</Badge>
                  <span className="text-muted-foreground">{device.status}</span>
                </div>
              ))}
              
              {!deviceStatus.connected && (
                <Alert>
                  <AlertDescription>
                    Please connect an Android device with USB debugging enabled.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extraction Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Start New Extraction</CardTitle>
          <CardDescription>
            Begin forensic data extraction from the connected device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="caseName">Case Name (optional)</Label>
            <Input
              id="caseName"
              placeholder="Enter case name..."
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              disabled={loading || status?.status === 'running'}
            />
          </div>
          
          <Button
            onClick={handleStartExtraction}
            disabled={
              !deviceStatus?.connected ||
              loading ||
              status?.status === 'running' ||
              deviceLoading
            }
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Extraction...
              </>
            ) : (
              'Start Extraction'
            )}
          </Button>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Extraction Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Extraction Status
              <Badge className={getStatusColor(status.status)}>
                {status.status.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>Job ID: {status.job_id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{status.progress}%</span>
              </div>
              <Progress value={status.progress} className="w-full" />
            </div>
            
            {/* Status Message */}
            <div className="text-sm text-muted-foreground">
              {status.message}
            </div>
            
            {/* Duration */}
            <div className="text-sm text-muted-foreground">
              Duration: {formatDuration(status.created_at, status.completed_at)}
            </div>
            
            {/* Error Message */}
            {status.error && (
              <Alert variant="destructive">
                <AlertDescription>{status.error}</AlertDescription>
              </Alert>
            )}
            
            {/* Actions */}
            {status.status === 'completed' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(forensicsAPI.getReportUrl(status.job_id), '_blank')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = forensicsAPI.getDownloadUrl(status.job_id);
                    link.download = `extraction_${status.job_id}.zip`;
                    link.click();
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download ZIP
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteExtraction}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
            
            {status.status === 'failed' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteExtraction}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Failed Extraction
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};