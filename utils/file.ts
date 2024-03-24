import { Response } from 'express'

export const validateFile = (
    res: Response, file: Express.Multer.File,
    maxSize: number, ...extensions: string[]
) => {
    if (maxSize < file.size) {
        res.status(413).json({
            success: false,
            message: `${file.originalname} is too large`
        })
        return
    }

    if (!extensions.includes(file.originalname.split('.').pop())) {
        res.status(415).json({
            success: false,
            message: `${file.originalname} extension is not allowed`
        })
        return
    }

    return file
}