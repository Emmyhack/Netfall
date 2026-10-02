import Link from 'next/link';
import { buttonClass } from './ui/Button';

/**
 * A one-button page for links that arrive by email. The action happens on a
 * deliberate POST, never on the GET that opened the page, so a mail
 * scanner following the link changes nothing.
 */
export function TokenAction({
  title,
  body,
  action,
  button,
  token,
}: {
  title: string;
  body: string;
  action: string;
  button: string;
  token: string | undefined;
}) {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-page px-5 pb-24 pt-12 sm:px-6">
        <h1 className="text-display max-w-[54rem] text-ink">{title}</h1>
        {token ? (
          <>
            <p className="mt-6 max-w-content text-lg text-ink-2">{body}</p>
            <form method="post" action={action} className="mt-10">
              <input type="hidden" name="token" value={token} />
              <button type="submit" className={buttonClass('primary', 'lg')}>
                {button}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-6 max-w-content text-lg text-ink-2">
            This link is missing its token. Open it again from the email, or{' '}
            <Link href="/alerts" className="underline underline-offset-4">
              set up a new alert
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
