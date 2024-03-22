import * as fs from 'fs'
import * as util from 'util'
import { S3 } from 'aws-sdk'
import { Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class WasabiService {
    private s3: S3
    private readonly bucketName = process.env.WASABI_BUCKET

    constructor() {
        this.s3 = new S3({
            useAccelerateEndpoint: false,
            credentials: {
                accessKeyId: process.env.WASABI_ACCESS_KEY,
                secretAccessKey: process.env.WASABI_SECRET_KEY,
            },
            endpoint: process.env.WASABI_ENDPOINT,
            region: process.env.WASABI_BUCKET_REGION,
        })
    }

    async uploadS3(file: Express.Multer.File, key: string) {
        const uploadParams: S3.PutObjectRequest = {
            Bucket: this.bucketName,
            Key: key,
            Body: fs.createReadStream(file.path)
        }

        const res = await this.s3.upload(uploadParams).promise()
        await util.promisify(fs.unlink)(file.path)

        return res
    }

    async deleteS3(key: string): Promise<void> {
        const deleteParams: S3.DeleteObjectRequest = {
            Bucket: this.bucketName,
            Key: key,
        }

        await this.s3.deleteObject(deleteParams).promise()
    }

    async downloadS3(key: string): Promise<Buffer> {
        const downloadParams: S3.GetObjectRequest = {
            Bucket: this.bucketName,
            Key: key,
        }

        const result = await this.s3.getObject(downloadParams).promise()
        if (!result.Body) {
            throw new NotFoundException('File not found')
        }

        return result.Body as Buffer
    }
}
