import { forwardRef, type InputHTMLAttributes } from 'react'

export interface VelvetFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  hint?: string
  error?: string
}

export const VelvetField = forwardRef<HTMLInputElement, VelvetFieldProps>(
  ({ id, label, hint, error, required, className = '', 'aria-describedby': describedBy, ...props }, ref) => {
    const hintId = hint ? `${id}-hint` : null
    const errorId = error ? `${id}-error` : null
    const descriptions = [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined

    return (
      <div className="velvet-field">
        <label className="velvet-label" htmlFor={id}>
          {label}
          {required ? <span className="velvet-label__required" aria-hidden="true"> *</span> : null}
        </label>
        <input
          {...props}
          ref={ref}
          id={id}
          required={required}
          className={`velvet-input ${className}`.trim()}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptions}
        />
        {hint ? <p id={hintId!} className="velvet-field__hint">{hint}</p> : null}
        {error ? <p id={errorId!} className="velvet-field__error" role="alert">{error}</p> : null}
      </div>
    )
  }
)

VelvetField.displayName = 'VelvetField'
