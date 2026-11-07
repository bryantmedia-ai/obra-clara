import {LIVE_CEMENT_OFFER_ID, LIVE_CEMENT_QUANTITY, LIVE_CEMENT_WHOLE_TOKENS} from "./fuji-asset";

export const demoProductPrice = 5;

export function hackathonProductPrice(offerId: string) {
  return offerId === LIVE_CEMENT_OFFER_ID
    ? Number(LIVE_CEMENT_WHOLE_TOKENS) / LIVE_CEMENT_QUANTITY
    : demoProductPrice;
}

export function hackathonProductName(offerId: string, name: string) {
  return offerId === LIVE_CEMENT_OFFER_ID && !name.endsWith(" (Demo)") ? name + " (Demo)" : name;
}
