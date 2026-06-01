import { Link } from '@tanstack/react-router';
import { Wand2, Settings2, Zap, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

interface CreateEventContentProps {
  onClose: () => void;
}

export function CreateEventContent({ onClose }: CreateEventContentProps) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        to="/tournaments/wizard"
        onClick={onClose}
        className="focus-visible:ring-primary rounded-xl focus-visible:ring-2 focus-visible:outline-none"
      >
        <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 flex flex-row items-center gap-5 p-5 text-left transition-colors">
          <div className="bg-primary text-primary-foreground shrink-0 rounded-2xl p-3">
            <Wand2 className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <Heading level={3}>Guided Setup</Heading>
            <Text size="sm" color="muted" className="mt-1 leading-relaxed">
              Step-by-step assistant to configure rules, players, and tee times.
            </Text>
          </div>
          <ChevronRight className="text-primary h-5 w-5 shrink-0" />
        </Card>
      </Link>

      <Link
        to="/rounds/new"
        onClick={onClose}
        className="focus-visible:ring-primary rounded-xl focus-visible:ring-2 focus-visible:outline-none"
      >
        <Card className="border-amber/20 bg-amber/5 hover:bg-amber/10 flex flex-row items-center gap-5 p-5 text-left transition-colors">
          <div className="bg-amber/20 shrink-0 rounded-2xl p-3">
            <Zap className="text-amber-foreground h-6 w-6" />
          </div>
          <div className="flex-1">
            <Heading level={3}>Quick Round</Heading>
            <Text size="sm" color="muted" className="mt-1 leading-relaxed">
              Start a casual round instantly with default club rules.
            </Text>
          </div>
          <ChevronRight className="text-muted-foreground h-5 w-5 shrink-0" />
        </Card>
      </Link>

      <Link
        to="/tournaments/new"
        onClick={onClose}
        className="focus-visible:ring-primary rounded-xl focus-visible:ring-2 focus-visible:outline-none"
      >
        <Card className="border-info/20 bg-info/5 hover:bg-info/10 flex flex-row items-center gap-5 p-5 text-left transition-colors">
          <div className="bg-info/20 shrink-0 rounded-2xl p-3">
            <Settings2 className="text-info h-6 w-6" />
          </div>
          <div className="flex-1">
            <Heading level={3}>Advanced Setup</Heading>
            <Text size="sm" color="muted" className="mt-1 leading-relaxed">
              Full control over multi-day tournaments and complex handicaps.
            </Text>
          </div>
          <ChevronRight className="text-muted-foreground h-5 w-5 shrink-0" />
        </Card>
      </Link>
    </div>
  );
}
