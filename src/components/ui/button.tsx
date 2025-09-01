
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium ring-offset-background shadow-sm transition-colors transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:shadow-md disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-[48px]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:scale-105 hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Melhorando o contraste para acessibilidade
        white: "bg-white text-libra-navy hover:bg-libra-silver border border-white",
        // Nova variante com alto contraste para garantir acessibilidade
        highContrast: "bg-black text-white hover:bg-gray-800 border border-black",
        goldContrast: "bg-[#D4AF37] text-black hover:bg-[#B8860B] border border-[#D4AF37] font-bold",
        whatsapp: "bg-[#25D366] text-white hover:bg-[#1EBEA5]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-full px-3",
        lg: "h-11 rounded-full px-8",
        // Tamanho suficiente para áreas de toque acessíveis
        xl: "h-14 rounded-full px-8 py-4 text-lg",
        // Aumentado para melhor área de toque
        icon: "h-12 w-12 min-w-12", 
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Garantir que o botão sempre tenha um aria-label se o conteúdo não for texto
    const hasTextContent = typeof props.children === 'string';
    const ariaLabel = props['aria-label'];
    const title = props.title;
    
    // Se não houver conteúdo de texto, aria-label ou title, adicione uma mensagem de aviso no console
    if (!hasTextContent && !ariaLabel && !title && process.env.NODE_ENV !== 'production') {
      console.warn('Botão sem texto deve ter um aria-label ou title para acessibilidade');
    }
    
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
