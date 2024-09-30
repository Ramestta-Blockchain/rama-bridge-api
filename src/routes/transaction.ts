import express from "express";
import { getTxById ,getTxList,createTx} from "../controllers/index";

const router = express.Router();

router.get("/me", getTxById);
router.get("/all", getTxList);
router.post("/create",createTx)

export default router;