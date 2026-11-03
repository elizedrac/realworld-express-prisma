import { Router } from "express";
import { countTagArticles, getTags } from "../../controllers/tagsController";

const router = Router();

router.get("/", getTags);

router.get("/:tag/count", countTagArticles);

export default router;
