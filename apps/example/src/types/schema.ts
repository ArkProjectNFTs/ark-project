import { z } from "zod";

const mintInfoSchema = z.object({
  address: z.string(),
  timestamp: z.number(),
  transaction_hash: z.string()
});

const normalizedSchema = z.object({
  image_mime_type: z.string().optional().or(z.literal("")),
  image_key: z.string().optional().or(z.literal("")),
  image: z.string().url().optional().or(z.literal("")),
  image_data: z.string().optional().or(z.literal("")),
  external_url: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  name: z.string().optional().or(z.literal("")),
  attributes: z.array(z.any()).optional(), // Define a more specific schema if the structure of attributes is known
  properties: z.union([z.any(), z.null()]), // Assuming properties can be any type or null
  background_color: z.string().optional().or(z.literal("")),
  animation_url: z.string().optional().or(z.literal("")),
  animation_key: z.string().optional().or(z.literal("")),
  animation_mime_type: z.string().optional().or(z.literal("")),
  youtube_url: z.string().optional().or(z.literal(""))
});

const metadataSchema = z
  .object({
    normalized: normalizedSchema.optional(),
    raw: z.string().optional(),
    metadata_updated_at: z.number().optional()
  })
  .nullable();

export const tokenSchema = z.object({
  contract_address: z.string(),
  token_id: z.string(),
  token_id_hex: z.string(),
  owner: z.string(),
  mint_info: mintInfoSchema,
  metadata: metadataSchema,
  is_listed: z.boolean().optional()
});

export const tokenMarketDataSchema = z.object({
  contract_address: z.string(),
  token_id: z.string(),
  token_id_hex: z.string(),
  owner: z.string(),
  num_sales: z.number(),
  last_sale: z.any().optional(),
  sell_orders: z.any().optional(),
  creator: z.any().optional(),
  traits: z.any().optional(),
  last_sale_event: z.any().optional(),
  top_bid: z.any().optional(),
  listing_date: z.any().optional(),
  is_presale: z.boolean().optional(),
  transfer_fee_payment_token: z.any().optional(),
  transfer_fee: z.any().optional(),
  start_date: z.number().optional(),
  end_date: z.number().optional()
});

const offerSchema = z.object({
  currency_address: z.string(),
  currency_chain_id: z.string(),
  end_date: z.number(),
  offer_amount: z.string(),
  offer_maker: z.string(),
  offer_quantity: z.string(),
  offer_timestamp: z.number(),
  order_hash: z.string(),
  start_date: z.number(),
  status: z.string()
});

const TokenWithMarketDataSchema = z.object({
  // Fields from the first API
  contract_address: z.string(),
  token_id: z.string(),
  token_id_hex: z.string(),
  owner: z.string(),
  mint_info: mintInfoSchema,
  metadata: metadataSchema,
  broker_id: z.string().optional(),
  current_owner: z.string().optional(),
  current_price: z.string().nullable().optional(),
  end_amount: z.string().optional(),
  end_date: z.number().optional(),
  has_offer: z.boolean().optional(),
  is_listed: z.boolean().optional(),
  listed_timestamp: z.number().optional(),
  quantity: z.string().optional(),
  start_amount: z.string().optional(),
  start_date: z.number().optional(),
  updated_timestamp: z.number().optional()
});

export type Offer = z.infer<typeof offerSchema>;

export type Token = z.infer<typeof tokenSchema>;

export type TokenMarketData = z.infer<typeof tokenMarketDataSchema>;

export type TokenWithMarketData = z.infer<typeof TokenWithMarketDataSchema>;
