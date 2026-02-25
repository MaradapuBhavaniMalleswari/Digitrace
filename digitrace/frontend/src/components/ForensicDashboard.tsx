import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  LayoutDashboard,
  Phone,
  MessageSquare,
  Users,
  Camera,
  Package,
  Download,
  Smartphone,
  Clock,
  Hash,
  Copy,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ForensicDashboardProps {
  deviceInfo: any;
}


const navigationItems = [
  { title: "Dashboard", icon: LayoutDashboard, value: "dashboard" },
  { title: "Call Logs", icon: Phone, value: "calls" },
  { title: "SMS Messages", icon: MessageSquare, value: "sms" },
  { title: "Contacts", icon: Users, value: "contacts" },
  { title: "Media Gallery", icon: Camera, value: "media" },
  { title: "Applications", icon: Package, value: "apps" },
  { title: "Report & Export", icon: Download, value: "report" }
];

export const ForensicDashboard = ({ deviceInfo }: ForensicDashboardProps) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();

  const copyHash = () => {
    const hash = "No hash available";
    navigator.clipboard.writeText(hash);
    toast({
      title: "Hash Copied",
      description: "No hash available for real-time extraction"
    });
  };

  const handleDownload = () => {
    toast({
      title: "Download Started",
      description: "Forensic report package is being prepared..."
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="w-64 border-r border-border">
          <SidebarContent>
            <div className="p-6 border-b border-sidebar-border">
              <h2 className="text-lg font-bold text-sidebar-foreground">
                ADB Extractor Pro
              </h2>
              <p className="text-sm text-sidebar-foreground/70">
                Forensic Analysis Dashboard
              </p>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.value}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.value)}
                        isActive={activeTab === item.value}
                        className="w-full justify-start"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-hidden">
          <header className="h-16 border-b border-border flex items-center px-6 bg-card">
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-4">
              <Smartphone className="h-5 w-5 text-primary" />
              <div>
                <h1 className="font-semibold">{deviceInfo?.model || "Unknown Device"}</h1>
                <p className="text-sm text-muted-foreground">
                  Android {deviceInfo?.androidVersion || "Unknown"}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="ml-auto status-success">
              Extraction Complete
            </Badge>
          </header>

          <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <Card className="card-professional">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {(0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="card-professional">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">SMS Messages</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {(0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="card-professional">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Contacts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {(0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="card-professional">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Media Files</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {(0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="card-professional">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Applications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {(0).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="card-professional">
                    <CardHeader>
                      <CardTitle>Communication Timeline</CardTitle>
                      <CardDescription>
                        Calls and SMS activity over the last 7 days
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No communication data available</p>
                        <p className="text-sm mt-2">Data will appear after extraction</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="card-professional">
                    <CardHeader>
                      <CardTitle>Call Distribution</CardTitle>
                      <CardDescription>
                        Breakdown of call types
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12 text-muted-foreground">
                        <p>No call distribution data available</p>
                        <p className="text-sm mt-2">Data will appear after extraction</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "report" && (
              <div className="space-y-6 max-w-3xl">
                <Card className="card-professional">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Forensic Report & Export
                    </CardTitle>
                    <CardDescription>
                      Download the complete extraction package with verification
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="space-y-1">
                        <h3 className="font-medium">Complete Forensic Package</h3>
                        <p className="text-sm text-muted-foreground">
                          Includes all extracted data, logs, and metadata
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Generated: {new Date().toLocaleString()}
                          </span>
                          <span>Size: 247.3 MB</span>
                        </div>
                      </div>
                      <Button onClick={handleDownload} className="gradient-professional">
                        <Download className="mr-2 h-4 w-4" />
                        Download ZIP
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        SHA256 Verification Hash
                      </h4>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <code className="flex-1 text-sm font-mono break-all text-muted-foreground">
                          No hash available - awaiting real extraction
                        </code>
                        <Button size="sm" variant="outline" onClick={copyHash} disabled>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use this hash to verify the integrity of your downloaded package
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Package Contents</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Device Information (device_info.json)</span>
                          <span className="text-muted-foreground">2.1 KB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Call Logs (call_log.json)</span>
                          <span className="text-muted-foreground">156.7 KB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SMS Messages (sms.json)</span>
                          <span className="text-muted-foreground">89.2 KB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contacts (contacts.json)</span>
                          <span className="text-muted-foreground">23.4 KB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Media Files (/media/)</span>
                          <span className="text-muted-foreground">245.8 MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Application Data</span>
                          <span className="text-muted-foreground">1.2 MB</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Placeholder content for other tabs */}
            {activeTab !== "dashboard" && activeTab !== "report" && (
              <Card className="card-professional">
                <CardHeader>
                  <CardTitle className="capitalize">{activeTab} Data</CardTitle>
                  <CardDescription>
                    Detailed view of extracted {activeTab} information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Detailed {activeTab} view would be implemented here</p>
                    <p className="text-sm mt-2">
                      This would show filterable, sortable tables and interactive data views
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};