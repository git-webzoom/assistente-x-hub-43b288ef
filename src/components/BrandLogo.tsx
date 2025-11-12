import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string; // e.g. 'w-8 h-8'
  alt?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className, alt = "AssistenteX" }) => {
  const base = import.meta.env.BASE_URL || "/";

  return (
    <div className={cn("relative", className)}>
      {/* Light mode logo */}
      <img
        src={`${base}logo-02.png`}
        alt={alt}
        className="block dark:hidden w-full h-full object-contain"
        loading="eager"
        decoding="async"
      />
      {/* Dark mode logo */}
      <img
        src={`${base}logo-01.png`}
        alt={alt}
        className="hidden dark:block w-full h-full object-contain"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

export default BrandLogo;