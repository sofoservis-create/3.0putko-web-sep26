import { Router, type IRouter } from "express";
import healthRouter from "./health";
import testAuthRouter from "./test-auth";
import testHostCalendarRouter from "./test-host-calendar";
import testHostReservationsRouter from "./test-host-reservations";
import testHostProfileRouter from "./test-host-profile";
import testHostMessagesRouter from "./test-host-messages";
import testHostDashboardRouter from "./test-host-dashboard";
import destinationsRouter from "./destinations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(testAuthRouter);
router.use(testHostCalendarRouter);
router.use(testHostReservationsRouter);
router.use(testHostProfileRouter);
router.use(testHostMessagesRouter);
router.use(testHostDashboardRouter);
router.use(destinationsRouter);

export default router;
