import { Router } from "express";
import { setupController } from "../controllers/setup.controller";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { setupCompleteSchema, setupSuggestSchema } from "../models/validators";

export const setupRouter = Router();

setupRouter.post("/suggestions", validate({ body: setupSuggestSchema }), asyncHandler(setupController.suggestions));
setupRouter.post("/complete", validate({ body: setupCompleteSchema }), asyncHandler(setupController.complete));
