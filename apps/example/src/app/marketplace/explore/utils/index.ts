import { Token, TokenWithMarketData } from "../../../../types/schema";

export function mergeTokenData(
  tokensWithMetadata: Token[],
  tokensWithMarketData: TokenWithMarketData[]
): Token[] {
  const tokenMap = new Map<string, TokenWithMarketData>();

  tokensWithMetadata.forEach((token) => {
    tokenMap.set(token.token_id_hex, { ...token, is_listed: false });
  });

  tokensWithMarketData.forEach((marketToken) => {
    const existingToken = tokenMap.get(marketToken.token_id);
    if (existingToken) {
      const { start_date, end_date, ...marketDataWithoutTokenId } = marketToken;

      tokenMap.set(marketToken.token_id, {
        ...existingToken,
        ...marketDataWithoutTokenId,
        start_date: start_date,
        end_date: end_date
      });
    }
  });

  return Array.from(tokenMap.values());
}
