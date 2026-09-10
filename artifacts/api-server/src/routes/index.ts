import { Router, type IRouter } from "express";
import healthRouter from "./health";
import testAuthRouter from "./test-auth";
import testHostCalendarRouter from "./test-host-calendar";
import destinationsRouter from "./destinations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(testAuthRouter);
router.use(testHostCalendarRouter);
router.use(destinationsRouter);

export default router;
