import { Router, type IRouter } from "express";
import healthRouter from "./health";
import testAuthRouter from "./test-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(testAuthRouter);

export default router;
