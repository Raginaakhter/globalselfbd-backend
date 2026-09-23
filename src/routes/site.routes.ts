import { Router, Request, Response } from "express";
import { getSiteData } from "../lib/site";

export const siteRouter = Router();

// GET /api/site
siteRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const data = await getSiteData();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("GET /api/site error:", error);
    return res.status(500).json({ success: false, message: "Failed to load site data" });
  }
});
