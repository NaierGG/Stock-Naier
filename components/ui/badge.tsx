import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium tracking-normal transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-secondary-foreground",
        accent: "border-primary/15 bg-primary/10 text-primary",
        muted: "border-border bg-background text-muted-foreground",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
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
