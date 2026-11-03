import { Router } from "express";
import {
  userGet,
  userRecent,
  userUpdate,
} from "../../controllers/userController";
import { authenticate } from "../../middleware/auth/authenticator";
import { userUpdateValidator } from "../../middleware/userValidator";

const router = Router();

router.get("/", authenticate, userGet);

router.put("/", authenticate, userUpdateValidator, userUpdate);

router.get("/recent", authenticate, userRecent);

export default router;
