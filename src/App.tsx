import { useEffect } from 'react';
import { CircleAlert, X } from 'lucide-react';
import { StoreProvider, useStore } from './state/store';
import { useReminderNotifier } from './state/useReminderNotifier';
import { ToastProvider } from './components/ui/Toast';
import { ConfirmProvider } from './components/ui/Confirm';
import { AppSheetsProvider } from './components/AppSheets';
import { AppShell } from './components/layout/AppShell';
import { useRoute } from './lib/router';
import { DashboardPage } from './pages/DashboardPage';
import { PantryPage } from './pages/PantryPage';
import { ItemDetailPage } from './pages/ItemDetailPage';
import { AlertsPage } from './pages/AlertsPage';
import { ShoppingPage } from './pages/ShoppingPage';
import { MarketPage } from './pages/MarketPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ImportPage } from './pages/ImportPage';
import { DemoBanner } from './components/DemoBanner';

const TITLES: Record<string, string> = {
  '': 'Home',
  pantry: 'My Pantry',
  alerts: 'Needs attention',
  import: 'Import from a file',
  shopping: 'Shopping list',
  market: 'Market planner',
  settings: 'Settings',
};

function Screen() {
  const route = useRoute();
  const [first, second] = route.segments;
  useReminderNotifier();

  useEffect(() => {
    const title = TITLES[first ?? ''];
    document.title = title ? `${title} · Pantry Power` : 'Pantry Power';
  }, [first]);

  let page;
  switch (first) {
    case undefined:
      page = <DashboardPage />;
      break;
    case 'pantry':
      page = second ? (
        <ItemDetailPage id={decodeURIComponent(second)} />
      ) : (
        <>
          <DemoBanner />
          <PantryPage key={route.query.toString()} query={route.query} />
        </>
      );
      break;
    case 'alerts':
      page = <AlertsPage key={route.query.get('tab') ?? ''} query={route.query} />;
      break;
    case 'import':
      page = <ImportPage key={route.query.get('mode') ?? ''} query={route.query} />;
      break;
    case 'shopping':
      page = <ShoppingPage />;
      break;
    case 'market':
      page = <MarketPage />;
      break;
    case 'settings':
      page = <SettingsPage />;
      break;
    default:
      page = <NotFoundPage />;
  }

  return (
    <AppShell path={route.path}>
      <StorageNotice />
      {page}
    </AppShell>
  );
}

function StorageNotice() {
  const { storageNotice, dismissStorageNotice } = useStore();
  if (!storageNotice) return null;
  return (
    <div role="alert" className="mb-5 flex items-start gap-3 rounded-2xl bg-danger-soft p-4 text-danger-deep">
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <p className="flex-1">{storageNotice}</p>
      <button type="button" onClick={dismissStorageNotice} aria-label="Dismiss" className="-m-2 inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/50">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppSheetsProvider>
            <Screen />
          </AppSheetsProvider>
        </ConfirmProvider>
      </ToastProvider>
    </StoreProvider>
  );
}
