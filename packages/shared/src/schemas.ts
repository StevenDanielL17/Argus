import { z } from "zod";

export const OrderbookEntrySchema = z.object({
  a: z.string(), // Amount
  n: z.number(), // Number of orders
  p: z.string(), // Price
});

export const OrderbookMessageSchema = z.object({
  channel: z.literal("book"),
  data: z.object({
    l: z.tuple([z.array(OrderbookEntrySchema), z.array(OrderbookEntrySchema)]), // [Bids, Asks]
    s: z.string(), // Symbol
    t: z.number(), // Timestamp in ms
    li: z.number(), // Exchange-wide nonce
  }),
});

export type OrderbookMessage = z.infer<typeof OrderbookMessageSchema>;
export type OrderbookEntry = z.infer<typeof OrderbookEntrySchema>;
