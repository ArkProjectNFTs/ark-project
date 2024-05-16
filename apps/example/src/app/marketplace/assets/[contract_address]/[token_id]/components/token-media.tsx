import { Token } from "@/types/schema";
import Media from "@/components/media";

export function TokenMedia({ token }: { token: Token }) {
  return (
    <Media
      url={
        token.metadata?.normalized?.image
          ? token.metadata.normalized.image
          : "/missing.jpg"
      }
      name={token.token_id || "Token Image"}
    />
  );
}

export default TokenMedia;
