// src/components/FileUploadCard.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, File } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileUploadCardProps {
  title: string;
  description: string;
  requiredColumns: string[];
  variant: 'p2p' | 'purchase' | 'sales';
}

const FileUploadCard = ({
  title,
  description,
  requiredColumns,
  variant,
}: FileUploadCardProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const getUploadLabel = () => {
    switch (variant) {
      case 'p2p':
        return 'P2P file';
      case 'purchase':
        return 'purchase file';
      case 'sales':
        return 'sales file';
      default:
        return 'file';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1) file-extension check
    if (!file.name.endsWith('.xlsx')) {
      setAlert({ type: 'error', text: `Invalid format. Please upload a ${getUploadLabel()} in .xlsx format.` });
      return;
    }

    setIsProcessing(true);
    setFileName(file.name);
    setAlert(null);

    // 2) header validation
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
      const headers = (rows[0] || []).map(String).map(h => h.trim());
      const missing = requiredColumns.filter(col => !headers.includes(col));
      const extra = headers.filter(h => !requiredColumns.includes(h));
      if (missing.length || extra.length) {
        setAlert({ type: 'error', text: 'Header mismatch' });
        setIsProcessing(false);
        event.target.value = '';
        return;
      }
    } catch (parseErr) {
      console.error('Header validation error:', parseErr);
      setAlert({ type: 'error', text: 'Failed to read Excel headers.' });
      setIsProcessing(false);
      event.target.value = '';
      return;
    }

    // 3) actual upload
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/upload/${variant}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setAlert({ type: 'success', text: result.message });
    } catch (error) {
      console.error('Error uploading file:', error);
      setAlert({
        type: 'error',
        text: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsProcessing(false);
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
          <label htmlFor={`file-upload-${variant}`} className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <Button type="button" variant={getButtonVariant()} disabled={isProcessing} className="pointer-events-none">
                  {isProcessing ? 'Processing...' : `Choose ${getUploadLabel()}`}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Upload {getUploadLabel()}</p>
            </div>
          </label>
        </div>

        {fileName && (
          <div className="text-sm">
            <span className="font-medium">Selected file:</span> {fileName}
          </div>
        )}

        {alert && (
          <div
            className={`p-4 rounded ${alert.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} flex justify-between items-center`}
          >
            <span>{alert.text}</span>
            <Button size="sm" onClick={() => setAlert(null)}>
              OK
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p className="font-medium mb-1">Required columns ({requiredColumns.length}):</p>
          <div className="max-h-32 overflow-y-auto">
            <ul className="space-y-1">
              {requiredColumns.map((column, index) => (
                <li key={index} className="truncate">
                  • {column}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FileUploadCard;
