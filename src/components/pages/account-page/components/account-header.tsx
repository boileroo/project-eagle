import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';

export function AccountHeader() {
  return (
    <div>
      <Heading level={1}>My Account</Heading>
      <Text color="muted">Manage your player profile and settings.</Text>
    </div>
  );
}
