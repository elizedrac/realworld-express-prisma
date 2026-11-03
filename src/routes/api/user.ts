import { Router } from "express";
import {
  userFavorites,
  userGet,
  userUpdate,
} from "../../controllers/userController";
import { authenticate } from "../../middleware/auth/authenticator";
import { userUpdateValidator } from "../../middleware/userValidator";

const router = Router();

router.get("/", authenticate, userGet);

router.put("/", authenticate, userUpdateValidator, userUpdate);

router.get("/favorites", authenticate, userFavorites);

export default router;
