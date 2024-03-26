import React from "react";

type MediaProps = {
  url: string;
  name: string;
};

const Media = ({ url, name }: MediaProps) => {
  const extension = url.split(".").pop();
  const imageUrl = url.replace(/\.mp4$/, ".jpg"); // Replace .mp4 with .jpg

  return extension === "mp4" ? (
    <video
      width={350}
      height={350}
      autoPlay
      loop
      muted
      poster={imageUrl}
      className="w-full"
    >
      <source src={url} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  ) : (
    <img
      src={url ? url : "https://via.placeholder.com/350"}
      alt={name ? name : "Image"}
      className="w-full h-full object-cover"
    />
  );
};

export default Media;
