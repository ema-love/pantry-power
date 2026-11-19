import { Compass } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <div className="card mt-6">
      <EmptyState icon={Compass} title="Page not found" action={<ButtonLink to="/">Go to Home</ButtonLink>}>
        That page doesn't exist.
      </EmptyState>
    </div>
  );
}
