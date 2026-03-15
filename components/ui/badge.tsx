import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-border/70 bg-secondary/70 text-secondary-foreground",
        accent:
          "border-primary/20 bg-primary/10 text-primary",
        muted:
          "border-border/60 bg-background/50 text-muted-foreground",
        success:
          "border-emerald-400/20 bg-emerald-400/10 text-emerald-300 dark:text-emerald-300"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
