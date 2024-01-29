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
  metadata: metadataSchema
});

export type Token = z.infer<typeof tokenSchema>;
