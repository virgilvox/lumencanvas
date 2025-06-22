import React, { useCallback, useState, type DragEvent } from 'react';
import { Upload, X, FileVideo, FileImage, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProjectionStore } from '@/store/projectionStore';

interface FileDropZoneProps {
  onFilesUploaded?: (files: File[]) => void;
  className?: string;
}

interface UploadedFile {
  file: File;
  id: string;
  url: string;
  type: 'image' | 'video';
}

const ACCEPTED_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogg'
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const FileDropZone: React.FC<FileDropZoneProps> = ({ 
  onFilesUploaded, 
  className = '' 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const addAsset = useProjectionStore(state => state.addAsset);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      return `File type "${file.type}" is not supported. Please use PNG, JPG, GIF, WebP, MP4, WebM, or OGG files.`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is 50MB.`;
    }

    return null;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    setIsUploading(true);

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    // Validate all files first
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        setIsUploading(false);
        return;
      }
      validFiles.push(file);
    }

    try {
      const processedFiles: UploadedFile[] = [];

      for (const file of validFiles) {
        // Create blob URL for preview/playback
        const url = URL.createObjectURL(file);
        const id = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const uploadedFile: UploadedFile = {
          file,
          id,
          url,
          type: file.type.startsWith('image/') ? 'image' : 'video'
        };

        processedFiles.push(uploadedFile);

        // Add to Zustand store as an asset
        addAsset({
          id,
          name: file.name,
          type: uploadedFile.type,
          url,
          size: file.size,
          meta: {
            originalFile: file,
            lastModified: file.lastModified,
            mimeType: file.type
          }
        });
      }

      setUploadedFiles(prev => [...prev, ...processedFiles]);
      onFilesUploaded?.(validFiles);
      
    } catch (err) {
      setError(`Failed to process files: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [addAsset, onFilesUploaded]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const getFileIcon = (type: 'image' | 'video') => {
    return type === 'image' ? FileImage : FileVideo;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <Card className={`transition-colors duration-200 ${
        isDragOver ? 'border-primary bg-primary/5' : 'border-dashed border-border'
      }`}>
        <CardContent className="p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="text-center space-y-4"
          >
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Drop media files here</h3>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse files
              </p>
            </div>

            <div className="flex flex-wrap gap-1 justify-center">
              {Object.values(ACCEPTED_TYPES).map(ext => (
                <Badge key={ext} variant="secondary" className="text-xs">
                  {ext}
                </Badge>
              ))}
            </div>

            <input
              type="file"
              multiple
              accept={Object.keys(ACCEPTED_TYPES).join(',')}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            
            <Button asChild variant="outline" disabled={isUploading}>
              <label htmlFor="file-upload" className="cursor-pointer">
                {isUploading ? 'Processing...' : 'Choose Files'}
              </label>
            </Button>

            <p className="text-xs text-muted-foreground">
              Maximum file size: 50MB
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Uploaded Files ({uploadedFiles.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {uploadedFiles.map((uploadedFile) => {
                const Icon = getFileIcon(uploadedFile.type);
                return (
                  <div key={uploadedFile.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {uploadedFile.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadedFile.id)}
                      className="ml-2 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};