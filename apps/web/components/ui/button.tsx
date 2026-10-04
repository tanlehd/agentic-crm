import * as React from 'react';
import { cva,type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
// Local shadcn-style primitive: native button semantics, CVA variants, Tailwind.
const variants=cva('inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:pointer-events-none disabled:opacity-50',{
  variants:{variant:{default:'bg-emerald-800 text-white hover:bg-emerald-900',outline:'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',destructive:'bg-red-700 text-white hover:bg-red-800'}},defaultVariants:{variant:'default'},
});
export function Button({className,variant,type='button',...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof variants>){return <button type={type} className={twMerge(clsx(variants({variant}),className))} {...props}/>;}
