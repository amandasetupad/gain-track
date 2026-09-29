import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from '../components/LegalLayout';

const CONTACT_EMAIL = 'pipare.amanda@gmail.com';

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 18, 2026">
      <p>
        GainTrack (“we”, “us”) is a personal fitness tracking app. This policy explains what
        information we collect, how we use it, and how you can ask us to delete it.
      </p>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Information we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <span className="text-zinc-100">Account:</span> your email address and a hashed
            password. We do not store your password in plain text.
          </li>
          <li>
            <span className="text-zinc-100">Workout data:</span> routines you create (names,
            exercises, optional media links), session logs (sets, reps, weight), and timestamps.
          </li>
          <li>
            <span className="text-zinc-100">Shared workouts:</span> if you share a routine, anyone
            with the link can see that routine’s name and exercises (not your session history).
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Cookies and local storage</h2>
        <p>
          GainTrack does not use advertising or tracking cookies. After you sign in, we store a JWT
          session token in your browser’s <span className="font-mono text-zinc-200">localStorage</span> so
          you stay logged in. You can clear it by logging out or clearing site data. We do not use
          the token for advertising.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">How we use your data</h2>
        <p>
          We use your account and workout logs only to provide the app: authenticate you, save your
          routines and sessions, and show progress. We do not sell your data, and we do not share it
          with advertisers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Hosting</h2>
        <p>
          The website is hosted on Vercel. The API and database are hosted on Render. Those
          providers process data as needed to run the service (for example, HTTPS, backups, and
          logs). Traffic to the app is encrypted in production via HTTPS.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Deleting your account</h2>
        <p>
          There is no in-app account deletion button yet. To delete your account and associated
          workout data, email{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=GainTrack%20account%20deletion`}
            className="text-gain-400 hover:text-gain-300 underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{' '}
          from the same address you registered with. We will remove your account, routines, and
          session logs.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Contact</h2>
        <p>
          Questions about this policy:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-gain-400 hover:text-gain-300 underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          . See also our{' '}
          <Link to="/terms" className="text-gain-400 hover:text-gain-300 underline-offset-2 hover:underline">
            Terms
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
