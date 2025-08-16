import { Injectable } from '@nestjs/common';
import { Client, Storage, ID } from 'node-appwrite';

@Injectable()
export class AppwriteService {
  private client: Client;
  private storage: Storage;

  constructor() {
    this.client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT!)
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);
    
    this.storage = new Storage(this.client);
  }

  async uploadFile(file: Express.Multer.File, path: string) {
    const fileId = ID.unique();
    
    const uint8Array = new Uint8Array(file.buffer);
    const fileObj = new File([uint8Array], file.originalname, { type: file.mimetype });
    
    const result = await this.storage.createFile(
      process.env.APPWRITE_BUCKET_ID!,
      fileId,
      fileObj
    );

    const url = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${result.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
    
    return { url, path: result.$id };
  }

  async getFileUrl(fileId: string) {
    return `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
  }

  async deleteFile(fileId: string) {
    await this.storage.deleteFile(process.env.APPWRITE_BUCKET_ID!, fileId);
  }

  async getFileBuffer(fileId: string) {
    const result = await this.storage.getFileDownload(process.env.APPWRITE_BUCKET_ID!, fileId);
    return Buffer.from(result);
  }


}