import { Router } from "express";
import { login, me, register } from "../controllers/authController";
import { authenticateJWT } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateJWT, me);

export default router;
