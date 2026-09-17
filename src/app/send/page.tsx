import { SendFlow } from '@/components/send-flow';
import { getSessionUser } from '@/lib/auth/session';

// Server component: the session is read from the cookie here, so a page reload
// never re-prompts a signed-in user for the wallet ownership proof.

export default async function SendPage() {
  const user = await getSessionUser();
  return <SendFlow signedIn={Boolean(user)} />;
}
