import localFont from "next/font/local";

export const arkProjectFont = localFont({
  src: [
    {
      path: "./ArkProject-Light.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./ArkProject-Regular.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./ArkProject-Medium.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "./ArkProject-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "./ArkProject-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-ark-project",
});

export const styreneAFont = localFont({
  src: [
    {
      path: "./StyreneA-Regular-Web.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./StyreneA-RegularItalic-Web.woff2",
      weight: "500",
      style: "italic",
    },
    {
      path: "./StyreneA-Bold-Web.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-styrene-a",
});
