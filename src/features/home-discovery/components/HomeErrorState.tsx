import React from 'react';

interface HomeErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    fallbackLabel?: string;
    onFallback?: () => void;
}

export default function HomeErrorState({
    title = 'No pudimos cargar esta sección',
    message,
    onRetry,
    fallbackLabel,
    onFallback
}: HomeErrorStateProps) {
    const messageId = React.useId();

    return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4" role="alert" aria-describedby={messageId}>
            <h3 className="text-sm font-semibold text-red-700">{title}</h3>
            <p id={messageId} className="mt-1 text-sm text-red-600">{message}</p>

            {(onRetry || (fallbackLabel && onFallback)) && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {onRetry && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700"
                        >
                            Reintentar
                        </button>
                    )}
                    {fallbackLabel && onFallback && (
                        <button
                            type="button"
                            onClick={onFallback}
                            className="rounded-lg border border-red-200 bg-red-100 px-3 py-1.5 text-sm text-red-700"
                        >
                            {fallbackLabel}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
