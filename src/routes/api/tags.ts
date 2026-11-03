import { Router } from "express";
import { getTag, getTags } from "../../controllers/tagsController";

const router = Router();

router.get("/", getTags);

router.get("/:tag", getTag);

export default router;
