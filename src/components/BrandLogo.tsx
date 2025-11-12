import React from "react";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ className, alt = "AssistenteX" }) => {
  const base = import.meta.env.BASE_URL || "/";

  return (
    <div className={cn("relative min-w-[200px]", className)}>
      {/* Light mode logo */}
      <img
        src={`${base}logo-02.png`}
        alt={alt}
        className="block dark:hidden w-full h-auto object-contain"
        loading="eager"
        decoding="async"
      />
      {/* Dark mode logo */}
      <img
        src={`${base}logo-01.png`}
        alt={alt}
        className="hidden dark:block w-full h-auto object-contain"
        loading="eager"
        decoding="async"
      />
    </div>
  );
};

export default BrandLogo;