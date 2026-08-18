interface FormMessageProps {
  type: 'error' | 'success' | 'info'
  message: string
}

export function FormMessage({ type, message }: FormMessageProps) {
  return (
    <div className={`form-message form-message--${type}`} role="alert" aria-live="polite">
      {message}
    </div>
  )
}
