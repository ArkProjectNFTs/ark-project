import Media from "@/components/media";

export function TokenMedia({ token }: { token: any }) {
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
