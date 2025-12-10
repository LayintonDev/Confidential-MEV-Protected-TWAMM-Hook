import * as React from "react"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      secondary: 'bg-green-500/20 text-green-400 border border-green-500/30',
      destructive: 'bg-red-500/20 text-red-400 border border-red-500/30',
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses[variant]} ${className || ''}`}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge"

export { Badge }
