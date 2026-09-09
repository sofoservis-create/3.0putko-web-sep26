import type { DestinationTile } from "@workspace/db/queries/destinations";

type Kind = DestinationTile["kind"];

/**
 * Destination tiles carry no photography yet — `hero_image_url` is null for
 * all 35, and putting stock imagery of "generic mountains" on Vysoké Tatry
 * would be exactly the kind of decorative lie this rebuild is trying to
 * get away from. So the tiles are typographic, and the only visual
 * differentiation is a tint keyed to what kind of place it is.
 *
 * This is a deliberate placeholder with a real shape: when commissioned or
 * host-supplied photography arrives, the image slots in behind the same
 * layout and these tints become the loading and fallback state, rather
 * than something to tear out.
 */
export const KIND_LABEL: Record<Kind, string> = {
  region: "Región",
  mountains: "Hory",
  city: "Mesto",
  thermal: "Termály",
  heritage: "Pamiatka",
  nature: "Príroda",
};

// The tint values themselves are tokens in globals.css, not hex literals
// here — a colour written inline in a component is how the current site
// accumulated ten different greens.
export const KIND_TINT: Record<Kind, string> = {
  region: "from-tint-region-from to-tint-region-to",
  mountains: "from-tint-mountains-from to-tint-mountains-to",
  city: "from-tint-city-from to-tint-city-to",
  thermal: "from-tint-thermal-from to-tint-thermal-to",
  heritage: "from-tint-heritage-from to-tint-heritage-to",
  nature: "from-tint-nature-from to-tint-nature-to",
};
