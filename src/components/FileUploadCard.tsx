import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, File } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileUploadCardProps {
  title: string;
  description: string;
  requiredColumns: string[];
  onProcess: (data: any[]) => void;
  variant: 'p2p' | 'purchase' | 'sales';
}

const FileUploadCard = ({ title, description, requiredColumns, onProcess, variant }: FileUploadCardProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const { toast } = useToast();

  const getVariantStyles = () => {
    switch (variant) {
      case 'p2p':
        return 'border-primary/20 hover:border-primary/40';
      case 'purchase':
        return 'border-success/20 hover:border-success/40';
      case 'sales':
        return 'border-warning/20 hover:border-warning/40';
      default:
        return 'border-primary/20 hover:border-primary/40';
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'p2p':
        return 'default';
      case 'purchase':
        return 'outline';
      case 'sales':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel (.xlsx) file.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        throw new Error('File is empty');
      }

      // Get headers from first row
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Filter data to only include required columns
      const requiredColumnIndexes = requiredColumns.map(col => {
        const index = headers.findIndex(header => 
          header?.toString().toLowerCase().trim() === col.toLowerCase().trim()
        );
        return { column: col, index };
      }).filter(item => item.index !== -1);

      if (requiredColumnIndexes.length === 0) {
        throw new Error('No required columns found in the file');
      }

      // Extract only required columns
      const filteredData = dataRows.map(row => {
        const filteredRow: any = {};
        requiredColumnIndexes.forEach(({ column, index }) => {
          filteredRow[column] = (row as any[])[index] || '';
        });
        return filteredRow;
      });

      onProcess(filteredData);

      toast({
        title: "File processed successfully",
        description: `Extracted ${filteredData.length} records with ${requiredColumnIndexes.length} required columns.`,
      });

    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <Card className={`transition-all duration-300 shadow-card hover:shadow-hover ${getVariantStyles()}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <File className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileUpload}
            className="hidden"
            id={`file-upload-${variant}`}
            disabled={isProcessing}
          />
          <label
            htmlFor={`file-upload-${variant}`}
            className="cursor-pointer"
          >
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <Button 
                  type="button" 
                  variant={getButtonVariant()} 
                  disabled={isProcessing}
                  className="pointer-events-none"
                >
                  {isProcessing ? 'Processing...' : 'Choose Excel File'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload .xlsx files only
              </p>
            </div>
          </label>
        </div>
        
        {fileName && (
          <div className="text-sm">
            <span className="font-medium">Selected file:</span> {fileName}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Required columns ({requiredColumns.length}):</p>
          <div className="max-h-32 overflow-y-auto">
            <ul className="space-y-1">
              {requiredColumns.map((column, index) => (
                <li key={index} className="truncate">• {column}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadCard;