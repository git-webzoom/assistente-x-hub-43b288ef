import { ReactNode } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SearchWithFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  filter?: ReactNode;
}

export const SearchWithFilter = ({ 
  value, 
  onChange, 
  placeholder = "Buscar...",
  filter 
}: SearchWithFilterProps) => {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="border-0 focus-visible:ring-0"
          />
        </div>
        {filter}
      </div>
    </Card>
  );
};
