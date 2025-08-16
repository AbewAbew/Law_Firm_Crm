// src/components/DocumentUploader.tsx
'use client';

import React, { useRef, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface DocumentUploaderProps {
  caseId: string;
  onUploadSuccess: () => void; // A callback to refresh the document list
}

export default function DocumentUploader({ caseId, onUploadSuccess }: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  // We use a ref to programmatically click the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    const toastId = toast.loading('Uploading document...');

    try {
      console.log('Starting upload to backend...');
      
      // Upload directly to backend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('caseId', caseId);
      
      await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Upload complete...');

      toast.success('Document uploaded successfully!', { id: toastId });
      onUploadSuccess();
    } catch (error: any) {
      console.error('Upload error details:', error);
      const errorMessage = error.code || error.response?.data?.message || error.message || 'Upload failed';
      toast.error(`Error: ${errorMessage}`, { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }} // The actual file input is hidden
        disabled={isUploading}
      />
      <Button
        variant="contained"
        startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
        onClick={handleButtonClick}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : 'Upload Document'}
      </Button>
    </>
  );
}