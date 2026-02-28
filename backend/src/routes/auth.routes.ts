import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { loginSchema, refreshSchema } from "../models/validators";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", validate({ body: loginSchema }), asyncHandler(authController.login));
authRouter.post("/refresh", validate({ body: refreshSchema }), asyncHandler(authController.refresh));
authRouter.post("/logout", validate({ body: refreshSchema }), asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
