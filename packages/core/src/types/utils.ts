export type Compute<type> = { [key in keyof type]: type[key] } & unknown;

export type OneOf<
  union extends object,
  ///
  keys extends KeyofUnion<union> = KeyofUnion<union>
> = union extends infer Item
  ? Compute<Item & { [K in Exclude<keys, keyof Item>]?: undefined }>
  : never;
type KeyofUnion<type> = type extends type ? keyof type : never;
