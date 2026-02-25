import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "./ui/sidebar";
import {
  LayoutDashboard,
  Smartphone,
  Hash,
  Settings,
  Play,
  Database,
  Shield,
  Copy
} from "lucide-react";
import { ExtractionControls } from "./ExtractionControls";
import { ExtractionDataView } from "./ExtractionDataView";
import { ExtractionManager } from "./ExtractionManager";
import { useDeviceStatus, useExtractionList } from "../hooks/useForensics";
import forensicsAPI from "../services/forensicsAPI";

type TabType = "dashboard" | "extraction" | "packages" | "management";

interface IntegratedForensicDashboardProps {
  deviceInfo?: any;
}

export const IntegratedForensicDashboard: React.FC<IntegratedForensicDashboardProps> = ({
  deviceInfo: propDeviceInfo
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { deviceStatus } = useDeviceStatus();
  const { extractions } = useExtractionList();
  const [integrityHash, setIntegrityHash] = useState<string | null>(null);

  // Use the device info from props if available, otherwise use the live device status
  const currentDeviceInfo = propDeviceInfo || deviceStatus;

  // Load integrity hash from the most recent completed extraction
  useEffect(() => {
    const loadIntegrityHash = async () => {
      if (extractions.length > 0) {
        const completedExtractions = extractions.filter(e => e.status === 'completed');
        if (completedExtractions.length > 0) {
          const mostRecent = completedExtractions[0];
          // Check if the extraction has a hash property
          if (mostRecent.hash) {
            setIntegrityHash(mostRecent.hash);
          }
        }
      }
    };

    loadIntegrityHash();
  }, [extractions]);

  // Auto-select most recent completed extraction when switching to data tabs
  useEffect(() => {
    if (activeTab === "packages" && !selectedJobId && extractions.length > 0) {
      const completedExtractions = extractions.filter(e => e.status === 'completed');
      if (completedExtractions.length > 0) {
        // Select the most recent completed extraction
        const mostRecent = completedExtractions[0];
        setSelectedJobId(mostRecent.job_id);
      }
    }
  }, [activeTab, selectedJobId, extractions]);

  const sidebarItems = [
    {
      id: "dashboard" as TabType,
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Overview and device status"
    },
    {
      id: "extraction" as TabType,
      label: "Start Extraction",
      icon: Play,
      description: "Begin forensic data extraction"
    },
    {
      id: "management" as TabType,
      label: "Manage Extractions",
      icon: Settings,
      description: "View and manage extraction history"
    },
    {
      id: "packages" as TabType,
      label: "View Data",
      icon: Database,
      description: "View extracted data (apps, contacts, messages, calls, media)"
    }
  ];

  const handleExtractionStart = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveTab("management");
  };

  const handleExtractionComplete = (jobId: string) => {
    setSelectedJobId(jobId);
    // Optionally switch to view the data
    // setActiveTab("packages");
  };

  const handleSelectExtraction = (jobId: string) => {
    setSelectedJobId(jobId);
    setActiveTab("packages"); // Start with packages view
  };

  const renderDeviceStatusCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Device Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentDeviceInfo ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={currentDeviceInfo.connected ? "default" : "secondary"}>
                {currentDeviceInfo.connected ? "Connected" : "Disconnected"}
              </Badge>
              {currentDeviceInfo.connected_devices && (
                <span className="text-sm text-muted-foreground">
                  {currentDeviceInfo.connected_devices.length} device(s)
                </span>
              )}
            </div>
            
            {currentDeviceInfo.connected_devices?.map((device: any, index: number) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{device.serial}</span>
                  <Badge variant="outline">{device.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Smartphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No device information available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );



  const renderMainContent = () => {
    if (activeTab === "dashboard") {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Digital Forensics Dashboard</h1>
              <p className="text-muted-foreground">
                Comprehensive mobile device forensic analysis platform
              </p>
            </div>
          </div>

          {renderDeviceStatusCard()}

          {/* Data Integrity Hash */}
          {integrityHash && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Data Integrity Verification
                </CardTitle>
                <CardDescription>
                  SHA-256 hash for forensic evidence integrity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">SHA-256 Hash</p>
                      <code className="text-xs font-mono bg-muted p-2 rounded block break-all">
                        {integrityHash}
                      </code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(integrityHash);
                      }}
                      title="Copy hash to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>This cryptographic hash ensures the integrity of the extracted data archive.</p>
                    <p>Use this hash to verify that the evidence has not been tampered with.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Extractions */}
          {extractions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Extractions</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setActiveTab("management")}
                  >
                    View All
                  </Button>
                </CardTitle>
                <CardDescription>
                  Latest forensic data extractions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {extractions.slice(0, 3).map((extraction) => (
                    <div 
                      key={extraction.job_id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                      onClick={() => {
                        setSelectedJobId(extraction.job_id);
                        setActiveTab("packages");
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          extraction.status === 'completed' ? 'bg-green-500' :
                          extraction.status === 'failed' ? 'bg-red-500' :
                          extraction.status === 'running' ? 'bg-blue-500 animate-pulse' :
                          'bg-yellow-500'
                        }`} />
                        <div>
                          <p className="font-medium">{extraction.case_name || 'Unnamed Case'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(extraction.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        extraction.status === 'completed' ? 'default' :
                        extraction.status === 'failed' ? 'destructive' :
                        extraction.status === 'running' ? 'secondary' :
                        'outline'
                      }>
                        {extraction.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Follow these steps to perform a forensic extraction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Connect Device</h4>
                    <p className="text-sm text-muted-foreground">
                      Connect your Android device via USB and enable USB debugging
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Start Extraction</h4>
                    <p className="text-sm text-muted-foreground">
                      Use the "Start Extraction" tab to begin the forensic process
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Analyze Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Review extracted data in the various analysis tabs
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (activeTab === "extraction") {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Start Extraction</h1>
            <p className="text-muted-foreground">
              Begin forensic data extraction from the connected device
            </p>
          </div>
          <ExtractionControls 
            onExtractionStart={handleExtractionStart}
            onExtractionComplete={handleExtractionComplete}
          />
        </div>
      );
    }

    if (activeTab === "management") {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Extractions</h1>
            <p className="text-muted-foreground">
              View and manage your extraction history
            </p>
          </div>
          <ExtractionManager onSelectExtraction={handleSelectExtraction} />
        </div>
      );
    }

    // Data views (packages - which includes all data tabs internally)
    if (activeTab === "packages") {
      if (!selectedJobId) {
        return (
          <Card>
            <CardContent className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Extraction Selected</h3>
              <p className="text-muted-foreground mb-4">
                Please select a completed extraction from the management tab to view data.
              </p>
              <Button onClick={() => setActiveTab("management")}>
                Go to Management
              </Button>
            </CardContent>
          </Card>
        );
      }

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Extraction Data</h1>
              <p className="text-muted-foreground">
                Viewing data from extraction: {selectedJobId.substring(0, 8)}...
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setActiveTab("management")}
            >
              Switch Extraction
            </Button>
          </div>
          <ExtractionDataView jobId={selectedJobId} />
        </div>
      );
    }

    return null;
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Digital Forensics</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.id)}
                        isActive={activeTab === item.id}
                        tooltip={item.description}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 overflow-hidden">
          <div className="p-6 h-full overflow-auto">
            <div className="mb-4">
              <SidebarTrigger />
            </div>
            {renderMainContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};