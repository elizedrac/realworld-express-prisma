import { Router } from "express";
import {
  userChangePassword,
  userGet,
  userUpdate,
} from "../../controllers/userController";
import { authenticate } from "../../middleware/auth/authenticator";
import { userUpdateValidator } from "../../middleware/userValidator";

const router = Router();

router.get("/", authenticate, userGet);

router.put("/", authenticate, userUpdateValidator, userUpdate);

router.post("/password", authenticate, userChangePassword);

export default router;
