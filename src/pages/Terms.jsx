import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from '../components/LegalLayout';

const CONTACT_EMAIL = 'pipare.amanda@gmail.com';

export default function Terms() {
  return (
    <LegalLayout title="Terms of Use" updated="September 18, 2026">
      <p>
        These terms govern your use of GainTrack, a personal fitness tracking app. By creating an
        account or using the service, you agree to them.
      </p>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">What GainTrack is</h2>
        <p>
          GainTrack lets you build workout routines, log sets, and review your own progress. It is
          a personal tracking tool, not a medical, coaching, or professional fitness service.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">No medical advice</h2>
        <p>
          Content in the app (including routines, numbers you log, and any linked exercise media)
          is not medical advice. Consult a qualified professional before starting or changing an
          exercise program. You use GainTrack at your own risk.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Your data</h2>
        <p>
          You own the routines and logs you create. We store them so the app can work for you. You
          are responsible for the accuracy of what you enter and for any media URLs you attach.
          Shared workout links expose the routine (not session history) to anyone with the URL.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Account responsibility</h2>
        <p>
          You are responsible for keeping your password confidential and for activity on your
          account. Use a valid email you control. Do not share your login. Notify us if you think
          your account was used without permission.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Acceptable use</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Do not abuse, scrape, or overload the service, or attempt to access other users’ accounts or data.</li>
          <li>Do not use GainTrack to store or share illegal content or malware via media links.</li>
          <li>Do not create accounts by automated means or circumvent rate limits or security features.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Availability</h2>
        <p>
          The service is provided “as is.” Hosting (Vercel and Render) may be interrupted, and we
          may change or discontinue features. We are not liable for lost workouts, downtime, or
          indirect damages to the extent permitted by law.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-zinc-100 font-semibold font-mono text-base">Contact</h2>
        <p>
          Questions:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-gain-400 hover:text-gain-300 underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          . Privacy details are in our{' '}
          <Link to="/privacy" className="text-gain-400 hover:text-gain-300 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
