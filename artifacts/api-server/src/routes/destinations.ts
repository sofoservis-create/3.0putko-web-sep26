import { Router, type IRouter } from "express";
import {
  GetDestinationCatalogResponse,
  GetDestinationResultsParams,
  GetDestinationResultsResponse,
  GetPopularDestinationsResponse,
} from "@workspace/api-zod";
import { destinations, destinationBySlug } from "../lib/destinations";
import {
  getDestinationSummaries,
  searchDestinationAccommodations,
} from "../lib/legacy-destinations-adapter";

const router: IRouter = Router();

router.get("/destinations/catalog", (_req, res) => {
  res.json(GetDestinationCatalogResponse.parse({
    version: 1,
    destinations,
  }));
});

router.get("/destinations", async (req, res): Promise<void> => {
  try {
    res.json(GetPopularDestinationsResponse.parse({
      version: 1,
      source: "legacy-public-accommodations",
      destinations: await getDestinationSummaries(),
    }));
  } catch (error) {
    req.log.error({ err: error }, "Could not load destination summaries");
    res.status(502).json({ error: "Destination data is temporarily unavailable" });
  }
});

router.get("/destinations/:slug/accommodations", async (req, res): Promise<void> => {
  const parsedParams = GetDestinationResultsParams.safeParse(req.params);
  if (!parsedParams.success || !destinationBySlug.has(parsedParams.data.slug)) {
    res.status(404).json({ error: "Unknown destination" });
    return;
  }
  const slug = parsedParams.data.slug;

  try {
    const query = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (typeof value === "string") query.set(key, value);
    });
    res.json(GetDestinationResultsResponse.parse(
      await searchDestinationAccommodations(slug, query),
    ));
  } catch (error) {
    req.log.error({ err: error, slug }, "Could not search destination accommodations");
    res.status(502).json({ error: "Destination results are temporarily unavailable" });
  }
});

export default router;