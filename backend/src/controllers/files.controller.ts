import { Request, Response } from "express";
import { storageService } from "../services/storage.service";

export const filesController = {
  async upload(req: Request, res: Response) {
    if (!req.file?.buffer) {
      res.status(400).json({ message: "File is required" });
      return;
    }

    const data = await storageService.uploadFile({
      tenantId: req.user!.tenantId,
      folder: req.body.folder ?? "general",
      fileName: req.file.originalname,
      contentType: req.file.mimetype,
      buffer: req.file.buffer
    });

    res.status(201).json(data);
  }
};
