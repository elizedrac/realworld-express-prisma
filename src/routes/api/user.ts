import { Router } from "express";
import {
  userConfirmPassword,
  userGet,
  userUpdate,
} from "../../controllers/userController";
import { authenticate } from "../../middleware/auth/authenticator";
import { userUpdateValidator } from "../../middleware/userValidator";

const router = Router();

router.get("/", authenticate, userGet);

router.put("/", authenticate, userUpdateValidator, userUpdate);

router.post("/confirm-password", authenticate, userConfirmPassword);

export default router;
