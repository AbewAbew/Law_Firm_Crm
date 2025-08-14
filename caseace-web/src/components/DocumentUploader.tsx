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

    // FormData is the required format for sending files
    const formData = new FormData();
    formData.append('file', file, file.name);

    try {
      // Send the file to our backend endpoint
      await api.post(`/cases/${caseId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Document uploaded successfully!', { id: toastId });
      onUploadSuccess(); // Trigger the refresh in the parent component
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Upload failed';
      toast.error(`Error: ${errorMessage}`, { id: toastId });
      console.error('Upload error', error);
    } finally {
      setIsUploading(false);
      // Reset the file input so the same file can be uploaded again if needed
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