import { type LabelHTMLAttributes } from 'react'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export function Label({ children, required, className = '', ...props }: LabelProps) {
  return (
    <label className={`label ${className}`} {...props}>
      {children}
      {required && (
        <span className="label-required" aria-hidden="true">
          {' '}*
        </span>
      )}
    </label>
  )
}
