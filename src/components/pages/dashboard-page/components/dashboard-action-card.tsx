import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface DashboardActionCardProps {
  eyebrow: string;
  eyebrowColor: 'red' | 'blue' | 'green' | 'white' | 'default' | 'muted';
  title: string;
  description: string;
  linkText: string;
  onClick: () => void;
}

export function DashboardActionCard({
  eyebrow,
  eyebrowColor,
  title,
  description,
  linkText,
  onClick,
}: DashboardActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left focus-visible:outline-none"
    >
      <Card
        isHoverable
        className="relative flex h-full w-full flex-col items-start gap-0 overflow-hidden rounded-3xl border-white/5 p-8"
      >
        <Text
          size="xs"
          color={eyebrowColor}
          className="mb-2 font-bold tracking-[0.2em] uppercase"
        >
          {eyebrow}
        </Text>
        <Heading level={3} color="white" className="mb-3">
          {title}
        </Heading>
        <Text
          size="sm"
          color="muted"
          className="mb-8 max-w-[80%] leading-relaxed"
        >
          {description}
        </Text>

        <Text
          size="xs"
          color="white"
          className="mt-auto flex items-center font-bold tracking-wider uppercase"
        >
          {linkText}
          <span className="ml-1">›</span>
        </Text>
      </Card>
    </button>
  );
}
