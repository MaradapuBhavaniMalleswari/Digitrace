import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Loader2, Download, Eye, Trash2, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useExtractionList, useSystemInfo } from '../hooks/useForensics';
import { ExtractionStatus } from '../services/forensicsAPI';
import forensicsAPI from '../services/forensicsAPI';

interface ExtractionManagerProps {
  onSelectExtraction?: (jobId: string) => void;
}

export const ExtractionManager: React.FC<ExtractionManagerProps> = ({
  onSelectExtraction
}) => {
  const { extractions, loading, error, refetch } = useExtractionList();
  const { storageInfo, cleanup } = useSystemInfo();
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 hover:bg-green-600';
      case 'failed': return 'bg-red-500 hover:bg-red-600';
      case 'running': return 'bg-blue-500 hover:bg-blue-600';
      case 'pending': return 'bg-yellow-500 hover:bg-yellow-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleDelete = async (jobId: string) => {
    setDeletingIds(prev => new Set(prev).add(jobId));
    try {
      await forensicsAPI.deleteExtraction(jobId);
      await refetch();
    } catch (error) {
      console.error('Failed to delete extraction:', error);
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleCleanup = async () => {
    try {
      await cleanup();
      await refetch();
    } catch (error) {
      console.error('Failed to cleanup extractions:', error);
    }
  };

  const sortedExtractions = [...extractions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Storage Info */}
      {storageInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Storage Information</CardTitle>
            <CardDescription>Disk usage and extraction statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{storageInfo.total_extractions}</div>
                <div className="text-sm text-muted-foreground">Total Extractions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatBytes(storageInfo.total_size)}</div>
                <div className="text-sm text-muted-foreground">Used Space</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {typeof storageInfo.available_space === 'number' 
                    ? formatBytes(storageInfo.available_space)
                    : storageInfo.available_space}
                </div>
                <div className="text-sm text-muted-foreground">Available Space</div>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cleanup Old Extractions
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cleanup Old Extractions</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove old extraction files that are older than 24 hours and not currently tracked.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCleanup}>
                      Cleanup
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extractions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Extraction History</CardTitle>
              <CardDescription>
                Manage and view all extraction jobs ({extractions.length} total)
              </CardDescription>
            </div>
            <Button variant="outline" onClick={refetch} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && extractions.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading extractions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Error loading extractions: {error}</p>
            </div>
          ) : extractions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No extractions found. Start a new extraction to get started.</p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedExtractions.map((extraction) => (
                    <TableRow key={extraction.job_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(extraction.status)}
                          <Badge className={getStatusColor(extraction.status)}>
                            {extraction.status.toUpperCase()}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {extraction.job_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(extraction.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDuration(extraction.created_at, extraction.completed_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full transition-all"
                              style={{ width: `${extraction.progress}%` }}
                            />
                          </div>
                          <span className="text-sm">{extraction.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* View Details */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Extraction Details</DialogTitle>
                                <DialogDescription>
                                  Job ID: {extraction.job_id}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <strong>Status:</strong> {extraction.status}
                                </div>
                                <div>
                                  <strong>Progress:</strong> {extraction.progress}%
                                </div>
                                <div>
                                  <strong>Message:</strong> {extraction.message}
                                </div>
                                <div>
                                  <strong>Created:</strong> {formatDate(extraction.created_at)}
                                </div>
                                {extraction.completed_at && (
                                  <div>
                                    <strong>Completed:</strong> {formatDate(extraction.completed_at)}
                                  </div>
                                )}
                                {extraction.error && (
                                  <div>
                                    <strong>Error:</strong>
                                    <div className="bg-red-50 p-2 rounded mt-1 text-red-700">
                                      {extraction.error}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          {/* View Data */}
                          {extraction.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onSelectExtraction?.(extraction.job_id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Download Report */}
                          {extraction.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(forensicsAPI.getReportUrl(extraction.job_id), '_blank')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Download ZIP */}
                          {extraction.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = forensicsAPI.getDownloadUrl(extraction.job_id);
                                link.download = `extraction_${extraction.job_id}.zip`;
                                link.click();
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Delete */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingIds.has(extraction.job_id)}
                              >
                                {deletingIds.has(extraction.job_id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Extraction</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this extraction? 
                                  This will remove all extracted files and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(extraction.job_id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};