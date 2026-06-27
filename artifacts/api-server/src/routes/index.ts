import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eventsRouter from "./events";
import articlesRouter from "./articles";
import ordersRouter from "./orders";
import settingsRouter from "./settings";
import systemSettingsRouter from "./system-settings";
import dashboardRouter from "./dashboard";
import deviceInfoRouter from "./device-info";
import snapshotsRouter from "./snapshots";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(eventsRouter);
router.use(articlesRouter);
router.use(ordersRouter);
router.use(settingsRouter);
router.use(systemSettingsRouter);
router.use(dashboardRouter);
router.use(deviceInfoRouter);
router.use(snapshotsRouter);

export default router;
