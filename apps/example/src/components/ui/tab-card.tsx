import React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

interface Props {
  children: React.ReactNode;
  cardTitle?: string;
  cardDescription?: string;
}

const Tab: React.FC<Props> = ({
  children,
  cardTitle = "Card Title",
  cardDescription = "Card Description"
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{cardTitle}</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default Tab;
