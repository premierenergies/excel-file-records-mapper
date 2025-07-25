import { useState } from 'react';
import FileUploadCard from '@/components/FileUploadCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  P2P_REQUIRED_COLUMNS, 
  PURCHASE_REQUIRED_COLUMNS, 
  SALES_REQUIRED_COLUMNS,
  convertToTextFile,
  getFormattedDateTime
} from '@/lib/dataProcessor';
import { Download } from 'lucide-react';

const Index = () => {
  const [p2pData, setP2pData] = useState<any[]>([]);
  const [purchaseData, setPurchaseData] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const { toast } = useToast();

  const handleP2PProcess = (data: any[]) => {
    setP2pData(data);
    const filename = `P2P_Data_${getFormattedDateTime()}.txt`;
    convertToTextFile(data, filename);
  };

  const handlePurchaseProcess = (data: any[]) => {
    setPurchaseData(data);
    const filename = `Purchase_Data_${getFormattedDateTime()}.txt`;
    convertToTextFile(data, filename);
  };

  const handleSalesProcess = (data: any[]) => {
    setSalesData(data);
    const filename = `Sales_Data_${getFormattedDateTime()}.txt`;
    convertToTextFile(data, filename);
  };

  const downloadAllFiles = () => {
    if (p2pData.length === 0 && purchaseData.length === 0 && salesData.length === 0) {
      toast({
        title: "No data to download",
        description: "Please upload and process files first.",
        variant: "destructive",
      });
      return;
    }

    const timestamp = getFormattedDateTime();
    
    if (p2pData.length > 0) {
      convertToTextFile(p2pData, `P2P_Data_${timestamp}.txt`);
    }
    if (purchaseData.length > 0) {
      convertToTextFile(purchaseData, `Purchase_Data_${timestamp}.txt`);
    }
    if (salesData.length > 0) {
      convertToTextFile(salesData, `Sales_Data_${timestamp}.txt`);
    }

    toast({
      title: "Files downloaded",
      description: "All processed data files have been downloaded.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary-light/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Business Data Processor
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload Excel files and extract required columns for P2P, Purchase, and Sales data processing
          </p>
        </div>

        {/* Upload Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <FileUploadCard
            title="P2P Data"
            description="Process procurement-to-payment data with 36 required columns"
            requiredColumns={P2P_REQUIRED_COLUMNS}
            onProcess={handleP2PProcess}
            variant="p2p"
          />
          
          <FileUploadCard
            title="Purchase Data"
            description="Process purchase invoice data with 43 required columns"
            requiredColumns={PURCHASE_REQUIRED_COLUMNS}
            onProcess={handlePurchaseProcess}
            variant="purchase"
          />
          
          <FileUploadCard
            title="Sales Data"
            description={`Process sales transaction data with ${SALES_REQUIRED_COLUMNS.length} required columns`}
            requiredColumns={SALES_REQUIRED_COLUMNS}
            onProcess={handleSalesProcess}
            variant="sales"
          />
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Upload Excel (.xlsx) files to extract and download the required columns as text files
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
