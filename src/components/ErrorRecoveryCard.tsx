type ErrorVariant = 'corrupt-archive' | 'missing-folder' | 'revoked-permission' | 'generic'

interface ErrorRecoveryCardProps {
  variant: ErrorVariant
  title?: string
  description?: string
  onRetry?: () => void | Promise<void>
}

const defaultMessages: Record<ErrorVariant, { title: string; description: string; cta: string }> =
  {
    'corrupt-archive': {
      title: 'Cannot open comic',
      description: 'This file appears to be corrupt or is not a supported archive format.',
      cta: 'Go back to library',
    },
    'missing-folder': {
      title: 'Folder not found',
      description:
        'The library folder could not be found. It may have been moved or deleted. Try rescanning.',
      cta: 'Retry',
    },
    'revoked-permission': {
      title: 'Permission required',
      description:
        'Access to this folder has been revoked. Grant permission again to continue reading.',
      cta: 'Re-grant permission',
    },
    generic: {
      title: 'Something went wrong',
      description: 'An unexpected error occurred. Please try again.',
      cta: 'Retry',
    },
  }

export default function ErrorRecoveryCard({
  variant,
  title,
  description,
  onRetry,
}: ErrorRecoveryCardProps) {
  const defaults = defaultMessages[variant]

  return (
    <div
      role="alert"
      className="bg-red-950/40 border border-red-800 rounded-lg p-4 text-red-200 max-w-md"
    >
      <p className="font-semibold mb-1">{title ?? defaults.title}</p>
      <p className="text-sm mb-4">{description ?? defaults.description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={() => void onRetry()}
          className="text-sm font-medium bg-red-800 hover:bg-red-700 px-3 py-1.5 rounded transition-colors"
        >
          {defaults.cta}
        </button>
      )}
    </div>
  )
}
