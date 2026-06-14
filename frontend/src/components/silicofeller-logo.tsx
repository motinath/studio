import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
}

export function SilicofellerLogo({ className, iconClassName }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/logo-removebg-preview.png"
        alt="Silicofeller"
        className={cn("h-16 w-auto object-contain", iconClassName)}
      />
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/logo-removebg-preview.png"
        alt="Silicofeller"
        className="h-7 w-auto object-contain"
      />
    </div>
  );
}