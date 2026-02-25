import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Smartphone, 
  Package, 
  Phone, 
  MessageSquare, 
  Users, 
  Camera, 
  MessageCircle,
  Chrome,
  Instagram,
  FileText,
  CheckCircle
} from "lucide-react";

interface ExtractionProgressProps {
  deviceInfo: any;
  onComplete: () => void;
}

const extractionSteps = [
  { id: 1, label: "Fetching device information", icon: Smartphone, progress: 10 },
  { id: 2, label: "Listing all installed applications", icon: Package, progress: 20 },
  { id: 3, label: "Extracting call logs", icon: Phone, progress: 35 },
  { id: 4, label: "Retrieving SMS messages", icon: MessageSquare, progress: 50 },
  { id: 5, label: "Downloading contacts", icon: Users, progress: 65 },
  { id: 6, label: "Pulling media files (photos & videos)", icon: Camera, progress: 75 },
  { id: 7, label: "Extracting WhatsApp data", icon: MessageCircle, progress: 85 },
  { id: 8, label: "Retrieving Chrome browser data", icon: Chrome, progress: 92 },
  { id: 9, label: "Extracting Instagram data", icon: Instagram, progress: 96 },
  { id: 10, label: "Compiling final report", icon: FileText, progress: 100 }
];

export const ExtractionProgress = ({ deviceInfo, onComplete }: ExtractionProgressProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < extractionSteps.length - 1) {
          const nextStep = prev + 1;
          setProgress(extractionSteps[nextStep].progress);
          return nextStep;
        } else {
          clearInterval(interval);
          setTimeout(() => onComplete(), 1500);
          return prev;
        }
      });
    }, 1500);

    // Start first step
    setProgress(extractionSteps[0].progress);

    return () => clearInterval(interval);
  }, [onComplete]);

  const currentStepData = extractionSteps[currentStep];
  const CurrentIcon = currentStepData?.icon || Smartphone;

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="heading-professional text-3xl">Forensic Extraction in Progress</h1>
          <p className="text-lg text-muted-foreground">
            Extracting data from {deviceInfo?.model || "Android Device"}
          </p>
        </div>

        {/* Device Info Card */}
        <Card className="card-elevated max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Smartphone className="h-5 w-5" />
              Connected Device
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Model:</span>
                <p className="font-medium">{deviceInfo?.model}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Android Version:</span>
                <p className="font-medium">{deviceInfo?.androidVersion}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Serial:</span>
                <p className="font-medium font-mono text-xs">{deviceInfo?.serialNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Build:</span>
                <p className="font-medium font-mono text-xs">{deviceInfo?.buildNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card className="card-professional max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CurrentIcon className="h-8 w-8 text-primary" />
                <div>
                  <CardTitle className="text-lg">
                    {currentStepData?.label}
                  </CardTitle>
                  <CardDescription>
                    Step {currentStep + 1} of {extractionSteps.length}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                {progress}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progress value={progress} className="h-3" />
            
            {/* Steps List */}
            <div className="space-y-3">
              {extractionSteps.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                
                return (
                  <div 
                    key={step.id}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isCurrent ? 'bg-primary/10' : isCompleted ? 'bg-success/5' : 'bg-muted/20'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <StepIcon className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    <span className={`text-sm ${
                      isCurrent ? 'font-medium text-primary' : 
                      isCompleted ? 'text-muted-foreground line-through' : 
                      'text-muted-foreground'
                    }`}>
                      {step.label}
                    </span>
                    {isCompleted && (
                      <Badge variant="outline" className="ml-auto status-success text-xs">
                        Done
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="max-w-2xl mx-auto border-warning/20 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-warning mt-2 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-warning-foreground">Security Notice</p>
                <p className="text-muted-foreground mt-1">
                  All extracted data is processed locally on your machine. No data is transmitted 
                  to external servers during this extraction process.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};