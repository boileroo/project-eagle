'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MeshGradientProps {
  className?: string;
}

export function MeshGradient({ className }: MeshGradientProps) {
  return (
    <div
      className={cn(
        // 'fixed' ensures the background stays locked in place while the content scrolls on top of it.
        // 'h-screen w-screen' ensures it covers the viewport perfectly regardless of page length.
        'bg-background pointer-events-none fixed inset-0 -z-50 h-screen w-screen overflow-hidden',
        className,
      )}
    >
      {/* Premium grain/noise overlay for smooth dithering */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.04] mix-blend-multiply dark:mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      <div className="absolute inset-0 z-0">
        {/* Neon Red/Rose Blob */}
        <motion.div
          animate={{
            // Expanded movement range: Swings widely across its quadrant
            x: ['0%', '40%', '10%', '-20%', '0%'],
            y: ['0%', '20%', '40%', '-10%', '0%'],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] -left-[20%] aspect-square w-[80vw] min-w-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(225,29,72,0.15) 10%, rgba(225,29,72,0) 60%)',
          }}
        />

        {/* Neon Green/Emerald Blob */}
        <motion.div
          animate={{
            // Expanded movement range: Swings widely across its quadrant
            x: ['0%', '-40%', '-10%', '20%', '0%'],
            y: ['0%', '-30%', '-40%', '10%', '0%'],
          }}
          transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-[20%] -bottom-[20%] aspect-square w-[80vw] min-w-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(16,185,129,0.12) 10%, rgba(16,185,129,0) 60%)',
          }}
        />
      </div>
    </div>
  );
}
