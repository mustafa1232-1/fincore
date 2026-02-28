import { Router } from "express";
import { searchController } from "../controllers/search.controller";
import { asyncHandler } from "../middleware/async-handler";
import { requireAuth } from "../middleware/auth";

export const searchRouter = Router();

searchRouter.use(requireAuth);
searchRouter.get("/", asyncHandler(searchController.global));
