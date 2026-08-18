import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, id, ...props }, ref) => {
    return (
      <div className="input-wrapper">
        <input
          ref={ref}
          id={id}
          className={`input ${error ? 'input--error' : ''} ${className}`}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
        {error && (
          <p id={`${id}-error`} className="input-error" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
