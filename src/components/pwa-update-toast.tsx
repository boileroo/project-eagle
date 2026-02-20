import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaUpdateToast() {
  const { needRefresh, updateServiceWorker } = useRegisterSW();

  useEffect(() => {
    if (!needRefresh[0]) return;

    toast('Update available', {
      action: {
        label: 'Refresh',
        onClick: () => void updateServiceWorker(true),
      },
    });
  }, [needRefresh, updateServiceWorker]);

  return null;
}
