import { Router } from "express";
import { getTagCounts, getTags } from "../../controllers/tagsController";

const router = Router();

router.get("/", getTags);

router.get("/counts", getTagCounts);

export default router;
