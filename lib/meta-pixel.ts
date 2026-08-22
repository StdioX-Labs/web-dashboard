/**
 * Meta pixel (dataset) ID. Hardcoded on purpose: it is a public identifier
 * that ships in the page source anyway, and keeping it out of the environment
 * avoids the Coolify trap where a NEXT_PUBLIC_ var that is not marked as a
 * build variable gets inlined as `undefined` and the pixel silently dies.
 *
 * The CAPI access token is the actual secret and stays in the environment.
 */
export const META_PIXEL_ID = "1412027874115324"
