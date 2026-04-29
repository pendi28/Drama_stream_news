import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import meloloRouter from "./melolo";

const router: IRouter = Router();

router.get("/sources", (_req, res) => {
  res.status(200).set("Cache-Control", "public, max-age=3600").json({
    sources: [{ id: "melolo", name: "Melolo" }],
  });
});

router.use(healthRouter);
router.use(proxyRouter);
router.use(meloloRouter);

export default router;
