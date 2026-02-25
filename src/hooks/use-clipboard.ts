import { useState } from 'react';
import { toast } from 'sonner';

interface UseClipboardOptions {
  /** Duration in ms before `copied` resets to false. Defaults to 2000. */
  resetDelay?: number;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Provides a `copy` function that writes text to the clipboard and a `copied`
 * flag that resets to `false` after `resetDelay` ms.
 *
 * Shows success/error toasts automatically.
 */
export function useClipboard(options: UseClipboardOptions = {}) {
  const {
    resetDelay = 2000,
    successMessage = 'Copied to clipboard',
    errorMessage = 'Failed to copy to clipboard',
  } = options;

  const [copied, setCopied] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(successMessage);
      setTimeout(() => setCopied(false), resetDelay);
    } catch {
      toast.error(errorMessage);
    }
  };

  return { copy, copied };
}
