/**
 * Google Ads conversion identifiers.
 *
 * Hardcoded for the same reason as the Meta pixel ID: these are public values
 * that ship in the page source anyway, and keeping them out of the environment
 * avoids the Coolify trap where a NEXT_PUBLIC_ variable that is not marked as
 * a build variable gets inlined as `undefined` and the conversion silently
 * never fires.
 */

/** "Organizer Lead (Get Started form)" — fires on the /get-started form submit. */
export const GADS_LEAD_CONVERSION = "AW-18374176127/C9lBCKTZh-YcEP_avrlE"

/** "Event Organiser Sign-up" — fires when a self-serve signup completes. */
export const GADS_SIGNUP_CONVERSION = "AW-18374176127/y-hJCMH9mN0cEP_avrlE"
