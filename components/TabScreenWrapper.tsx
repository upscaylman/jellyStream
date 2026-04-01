import React from "react";

interface Props {
  children: React.ReactNode;
  isActive: boolean;
  slideDirection: "left" | "right";
}

export function TabScreenWrapper({ children }: Props) {
  return <>{children}</>;
}
