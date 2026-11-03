import { Router } from "express";
import {
  userGet,
  userSetImage,
  userUpdate,
} from "../../controllers/userController";
import { authenticate } from "../../middleware/auth/authenticator";
import { userUpdateValidator } from "../../middleware/userValidator";

const router = Router();

router.get("/", authenticate, userGet);

router.put("/", authenticate, userUpdateValidator, userUpdate);

router.put("/image", authenticate, userSetImage);

export default router;
