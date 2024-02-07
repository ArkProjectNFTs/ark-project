import Link from "next/link";

import { cn } from "@/lib/utils";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/marketplace"
        className="text-sm font-medium transition-colors hover:text-primary"
      >
        Explore
      </Link>
      <Link
        href="/marketplace/mint"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Mint
      </Link>
      <Link
        href="/marketplace/portfolio"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Portfolio
      </Link>
      <Link
        href="/marketplace/activity"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Activity
      </Link>
    </nav>
  );
}
