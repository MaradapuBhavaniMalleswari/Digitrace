import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone, Usb, Settings, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type ConnectionState = "idle" | "scanning" | "connected" | "error";

interface DeviceConnectionProps {
  onDeviceConnected: (deviceInfo: any) => void;
}

export const DeviceConnection = ({ onDeviceConnected }: DeviceConnectionProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const { toast } = useToast();

  const detectADBDevice = async (): Promise<any> => {
    console.log("Starting ADB device detection...");
    
    // Method 1: Try WebUSB API for direct device communication
    if ('usb' in navigator) {
      try {
        console.log("WebUSB supported, attempting device detection...");
        
        // Request access to USB devices (Android devices typically use these vendor IDs)
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: 0x18d1 }, // Google
            { vendorId: 0x04e8 }, // Samsung
            { vendorId: 0x0bb4 }, // HTC
            { vendorId: 0x12d1 }, // Huawei
            { vendorId: 0x19d2 }, // ZTE
            { vendorId: 0x1004 }, // LG
            { vendorId: 0x22b8 }, // Motorola
            { vendorId: 0x0fce }, // Sony Ericsson
            { vendorId: 0x413c }, // Dell
            { vendorId: 0x0489 }, // Foxconn
            { vendorId: 0x2717 }, // Xiaomi
            { vendorId: 0x2a45 }, // OnePlus
          ]
        });

        if (device) {
          console.log("USB device detected:", device);
          await device.open();
          
          // Try to get device info
          const deviceInfo = {
            name: device.productName || "Android Device",
            model: device.productName || "Unknown Model", 
            androidVersion: "Unknown",
            serialNumber: device.serialNumber || `USB-${Date.now()}`,
            manufacturer: device.manufacturerName || "Unknown",
            isRooted: false,
            batteryLevel: 85,
            storageUsed: 45,
            lastConnected: new Date().toISOString(),
            usbDevice: device
          };
          
          console.log("Device info extracted:", deviceInfo);
          await device.close();
          return deviceInfo;
        }
      } catch (usbError) {
        console.log("WebUSB detection failed:", usbError);
        // Continue to alternative methods
      }
    }

    // Method 2: Try Web Serial API (for some Android devices with serial interface)
    if ('serial' in navigator) {
      try {
        console.log("Web Serial supported, attempting detection...");
        const port = await (navigator as any).serial.requestPort();
        
        if (port) {
          console.log("Serial device detected:", port);
          const deviceInfo = {
            name: "Android Device (Serial)",
            model: "Serial Connected Device",
            androidVersion: "Unknown", 
            serialNumber: `SERIAL-${Date.now()}`,
            manufacturer: "Unknown",
            isRooted: false,
            batteryLevel: 80,
            storageUsed: 35,
            lastConnected: new Date().toISOString(),
            serialPort: port
          };
          
          console.log("Serial device info:", deviceInfo);
          return deviceInfo;
        }
      } catch (serialError) {
        console.log("Web Serial detection failed:", serialError);
      }
    }

    // Method 3: Check for existing WebUSB devices that might be connected
    if ('usb' in navigator) {
      try {
        const devices = await (navigator as any).usb.getDevices();
        console.log("Checking existing USB devices:", devices);
        
        for (const device of devices) {
          // Check if it's an Android device based on vendor ID
          const androidVendorIds = [0x18d1, 0x04e8, 0x0bb4, 0x12d1, 0x19d2, 0x1004, 0x22b8, 0x0fce, 0x413c, 0x0489, 0x2717, 0x2a45];
          
          if (androidVendorIds.includes(device.vendorId)) {
            console.log("Found existing Android device:", device);
            
            const deviceInfo = {
              name: device.productName || "Android Device",
              model: device.productName || "Unknown Model",
              androidVersion: "Unknown",
              serialNumber: device.serialNumber || `USB-${device.vendorId}-${Date.now()}`,
              manufacturer: device.manufacturerName || "Unknown",
              isRooted: false,
              batteryLevel: 90,
              storageUsed: 40,
              lastConnected: new Date().toISOString(),
              usbDevice: device
            };
            
            return deviceInfo;
          }
        }
      } catch (error) {
        console.log("Error checking existing devices:", error);
      }
    }

    console.log("No ADB/Android devices detected through any method");
    return null;
  };

  const handleScanDevice = async () => {
    // Reset any previous state
    setShowErrorDialog(false);
    setConnectionState("scanning");
    
    try {
      console.log("Starting device scan...");
      
      // Add a small delay for UI feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Attempt to detect real ADB device
      const deviceInfo = await detectADBDevice();
      
      if (deviceInfo) {
        console.log("Device successfully detected:", deviceInfo);
        setConnectionState("connected");
        
        toast({
          title: "Device Connected!",
          description: `${deviceInfo.name} detected and ready for extraction.`,
        });
        
        // Small delay for UI feedback, then proceed
        setTimeout(() => {
          console.log("Proceeding to extraction with device:", deviceInfo);
          onDeviceConnected(deviceInfo);
        }, 1000);
      } else {
        console.log("No device found, showing error state");
        // Device not found - show error and stay on current screen
        setConnectionState("error");
        setShowErrorDialog(true);
        toast({
          title: "No Device Found",
          description: "Please connect your Android device and enable USB debugging.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Device scan error:", error);
      setConnectionState("error");
      setShowErrorDialog(true);
      toast({
        title: "Connection Error",
        description: `Failed to scan for devices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleRetryConnection = () => {
    // Properly reset all state for clean retry
    setShowErrorDialog(false);
    setConnectionState("idle");
  };

  const handleStartNewScan = () => {
    // Clean reset function for starting fresh scan
    setShowErrorDialog(false);
    setConnectionState("idle");
  };

  const getStateIcon = () => {
    switch (connectionState) {
      case "scanning":
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
      case "connected":
        return <CheckCircle className="h-12 w-12 text-success" />;
      case "error":
        return <AlertCircle className="h-12 w-12 text-destructive" />;
      default:
        return <Smartphone className="h-12 w-12 text-muted-foreground" />;
    }
  };

  const getStateMessage = () => {
    switch (connectionState) {
      case "scanning":
        return "Scanning for Android devices...";
      case "connected":
        return "Device connected successfully! Starting extraction...";
      case "error":
        return "No device found. Please check your connection and try again.";
      default:
        return "Please connect your Android device to begin forensic extraction.";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="heading-professional text-4xl">ADB Extractor Pro</h1>
          <p className="text-xl text-muted-foreground">
            Professional Android Device Forensic Extraction Tool
          </p>
        </div>

        {/* Main Connection Card */}
        <Card className="card-professional max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStateIcon()}
            </div>
            <CardTitle className="subheading-professional">
              Device Connection
            </CardTitle>
            <CardDescription className="text-base">
              {getStateMessage()}
            </CardDescription>
            {connectionState !== "idle" && (
              <Badge 
                variant={connectionState === "connected" ? "default" : connectionState === "error" ? "destructive" : "secondary"}
                className="mx-auto w-fit mt-2"
              >
                {connectionState.toUpperCase()}
              </Badge>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {connectionState === "idle" && (
              <Button 
                onClick={handleScanDevice}
                className="w-full h-12 text-lg gradient-professional"
                size="lg"
              >
                <Smartphone className="mr-2 h-5 w-5" />
                Scan for Device
              </Button>
            )}
            
            {connectionState === "error" && (
              <div className="space-y-3">
                <Button 
                  onClick={handleScanDevice}
                  className="w-full h-12 text-lg gradient-professional"
                  size="lg"
                >
                  <Smartphone className="mr-2 h-5 w-5" />
                  Retry Scan
                </Button>
                <Button 
                  onClick={handleStartNewScan}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Start Fresh
                </Button>
              </div>
            )}
            
            {connectionState === "connected" && (
              <div className="text-center text-sm text-muted-foreground">
                Proceeding to extraction...
              </div>
            )}

          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="card-elevated max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Setup Instructions
            </CardTitle>
            <CardDescription>
              Follow these steps to enable USB debugging on your Android device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold">Enable Developer Options</h3>
                <p className="text-sm text-muted-foreground">
                  Go to Settings → About Phone → Tap "Build Number" 7 times
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold">Enable USB Debugging</h3>
                <p className="text-sm text-muted-foreground">
                  Go to Settings → Developer Options → Turn on "USB Debugging"
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold">Connect Device</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your device via USB and authorize this computer
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              No Device Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              No ADB devices were detected. Please ensure:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your Android device is connected via USB</li>
                <li>USB Debugging is enabled</li>
                <li>You have authorized this computer on your device</li>
                <li>ADB drivers are properly installed</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleRetryConnection}>
              Try Again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};