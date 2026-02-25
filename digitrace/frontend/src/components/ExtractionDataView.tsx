import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Search, Download, Eye, Package, Phone, MessageSquare, Users, Image } from 'lucide-react';
import { useExtractionData } from '../hooks/useForensics';
import forensicsAPI from '../services/forensicsAPI';

interface ExtractionDataViewProps {
  jobId: string;
}

export const ExtractionDataView: React.FC<ExtractionDataViewProps> = ({ jobId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const {
    summary,
    deviceInfo,
    packages,
    contacts,
    sms,
    callLogs,
    media,
    loading,
    error,
  } = useExtractionData(jobId);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading extraction data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-500">
            <p>Error loading extraction data: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filterData = (data: any[], searchFields: string[]) => {
    if (!searchTerm) return data;
    return data.filter(item =>
      searchFields.some(field =>
        item[field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Extraction Summary</CardTitle>
            <CardDescription>Overview of extracted data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.files_count}</div>
                <div className="text-sm text-muted-foreground">Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatBytes(summary.total_size)}</div>
                <div className="text-sm text-muted-foreground">Total Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{packages.length}</div>
                <div className="text-sm text-muted-foreground">Apps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{media.length}</div>
                <div className="text-sm text-muted-foreground">Media Files</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device Info Card */}
      {deviceInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Device Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>Manufacturer:</strong> {deviceInfo['ro.product.manufacturer'] || 'Unknown'}
              </div>
              <div>
                <strong>Model:</strong> {deviceInfo['ro.product.model'] || 'Unknown'}
              </div>
              <div>
                <strong>Android Version:</strong> {deviceInfo['ro.build.version.release'] || 'Unknown'}
              </div>
              <div>
                <strong>Build Number:</strong> {deviceInfo['ro.build.display.id'] || 'Unknown'}
              </div>
              <div>
                <strong>Serial Number:</strong> {deviceInfo['ro.serialno'] || 'Unknown'}
              </div>
              <div>
                <strong>Security Patch:</strong> {deviceInfo['ro.build.version.security_patch'] || 'Unknown'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search across all data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => window.open(forensicsAPI.getReportUrl(jobId), '_blank')}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Report
        </Button>
      </div>

      {/* Data Tabs */}
      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="packages" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Apps ({packages.length})
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts ({contacts.length})
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS ({sms.length})
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Calls ({callLogs.length})
          </TabsTrigger>
          <TabsTrigger value="media" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Media ({media.length})
          </TabsTrigger>
        </TabsList>

        {/* Packages Tab */}
        <TabsContent value="packages">
          <Card>
            <CardHeader>
              <CardTitle>Installed Applications</CardTitle>
              <CardDescription>List of all installed packages on the device</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Package Name</TableHead>
                      <TableHead>APK Path</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterData(packages, ['package', 'apk_path']).map((pkg, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{pkg.package}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{pkg.apk_path}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
              <CardDescription>Contact information from the device</CardDescription>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No contacts found. This may require special permissions on the device.
                </p>
              ) : (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Times Contacted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterData(contacts, ['name', 'display_name', 'number']).map((contact, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {contact.display_name || contact.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="font-mono">{contact.number || contact.primary_phone || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {contact.type === '1' ? 'Home' : contact.type === '2' ? 'Mobile' : contact.type === '3' ? 'Work' : 'Other'}
                            </Badge>
                          </TableCell>
                          <TableCell>{contact.times_contacted || '0'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle>SMS Messages</CardTitle>
              <CardDescription>Text messages from the device</CardDescription>
            </CardHeader>
            <CardContent>
              {sms.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No SMS messages found. This may require special permissions on the device.
                </p>
              ) : (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Body</TableHead>
                        <TableHead>Read</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterData(sms, ['address', 'body']).map((message, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant={message.type === '1' ? 'default' : 'secondary'}>
                              {message.type === '1' ? 'Received' : message.type === '2' ? 'Sent' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{message.address || 'Unknown'}</TableCell>
                          <TableCell className="text-sm">
                            {message.date ? new Date(parseInt(message.date)).toLocaleString() : 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-md truncate">{message.body || ''}</TableCell>
                          <TableCell>
                            <Badge variant={message.read === '1' ? 'outline' : 'default'}>
                              {message.read === '1' ? 'Read' : 'Unread'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Call Logs Tab */}
        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Call Logs</CardTitle>
              <CardDescription>Call history from the device</CardDescription>
            </CardHeader>
            <CardContent>
              {callLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No call logs found. This may require special permissions on the device.
                </p>
              ) : (
                <ScrollArea className="h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filterData(callLogs, ['number', 'name']).map((call, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant={call.type === '1' ? 'default' : call.type === '2' ? 'secondary' : 'destructive'}>
                              {call.type === '1' ? 'Incoming' : call.type === '2' ? 'Outgoing' : call.type === '3' ? 'Missed' : 'Other'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{call.number || 'Unknown'}</TableCell>
                          <TableCell>{call.name || 'N/A'}</TableCell>
                          <TableCell className="text-sm">
                            {call.date ? new Date(parseInt(call.date)).toLocaleString() : 'N/A'}
                          </TableCell>
                          <TableCell>{call.duration ? `${Math.floor(parseInt(call.duration) / 60)}m ${parseInt(call.duration) % 60}s` : '0s'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Media Files</CardTitle>
              <CardDescription>Photos, videos, and other media files</CardDescription>
            </CardHeader>
            <CardContent>
              {media.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No media files found.
                </p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filterData(media, ['filename']).map((file, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-2">
                          <div className="font-medium text-sm">{file.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatBytes(file.size)}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(forensicsAPI.getMediaFileUrl(jobId, file.filename), '_blank')}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = forensicsAPI.getMediaFileUrl(jobId, file.filename);
                                link.download = file.filename;
                                link.click();
                              }}
                            >
                              <Download className="mr-1 h-3 w-3" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};