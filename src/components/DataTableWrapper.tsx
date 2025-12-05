import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface DataTableWrapperProps {
  children: ReactNode;
}

export const DataTableWrapper = ({ children }: DataTableWrapperProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        {children}
      </div>
    </Card>
  );
};