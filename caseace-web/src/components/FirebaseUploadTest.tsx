'use client';
import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export default function FirebaseUploadTest() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadURL, setDownloadURL] = useState<string>('');

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      const storageRef = ref(storage, `test/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setDownloadURL(url);
      alert('Upload successful!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    }
    setUploading(false);
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-4">Firebase Storage Test</h3>
      
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />
      
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : 'Upload to Firebase'}
      </button>
      
      {downloadURL && (
        <div className="mt-4">
          <p>File uploaded successfully!</p>
          <a href={downloadURL} target="_blank" className="text-blue-500 underline">
            View File
          </a>
        </div>
      )}
    </div>
  );
}