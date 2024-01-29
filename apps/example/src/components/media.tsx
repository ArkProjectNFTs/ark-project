import React from "react";

import Image from "next/image";

type MediaProps = {
  url: string;
  name: string;
};

const Media = ({ url, name }: MediaProps) => {
  const extension = url.split(".").pop();
  const imageUrl = url.replace(/\.mp4$/, ".jpg"); // Replace .mp4 with .jpg

  return extension === "mp4" ? (
    <video width={350} height={350} autoPlay loop muted poster={imageUrl}>
      <source src={url} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  ) : (
    <Image
      src={url}
      alt={name ? name : "Image"}
      width={350}
      height={350}
      layout="cover"
    />
  );
};

export default Media;
