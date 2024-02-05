import { Token, TokenWithMarketData } from "../../../../types/schema";

export function mergeTokenData(
  tokensWithMetadata: Token[],
  tokensWithMarketData: TokenWithMarketData[]
): Token[] {
  const tokenMap = new Map<string, TokenWithMarketData>();
  const currentDate = Math.floor(Date.now() / 1000); // Current date in Unix timestamp (seconds)

  tokensWithMetadata.forEach((token) => {
    tokenMap.set(token.token_id_hex, { ...token, is_listed: false });
  });

  tokensWithMarketData.forEach((marketToken) => {
    const existingToken = tokenMap.get(marketToken.token_id);
    if (existingToken) {
      const { token_id, start_date, end_date, ...marketDataWithoutTokenId } =
        marketToken;

      // Determine if the token is listed
      const isListed = start_date
        ? start_date <= currentDate && (!end_date || currentDate <= end_date)
        : false;

      tokenMap.set(marketToken.token_id, {
        ...existingToken,
        ...marketDataWithoutTokenId,
        start_date: start_date,
        end_date: end_date,
        is_listed: isListed
      });
    }
  });

  return Array.from(tokenMap.values());
}
