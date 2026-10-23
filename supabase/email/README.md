# Foxey authentication email setup

Foxey's browser code cannot choose the sender of Supabase Auth emails. Configure a custom SMTP provider in the existing Supabase project's Authentication settings, using a verified Foxey domain. Set the sender name to `Foxey` and the sender address to a verified address such as `no-reply@foxeylabs.com`. Keep SMTP credentials in Supabase settings, never in this repository or `NEXT_PUBLIC_*` variables.

The confirmation template in `confirm-signup.html` can be copied into Authentication → Email Templates → Confirm sign up, with subject `Confirm your Foxey account`. Keep the `{{ .ConfirmationURL }}` variable intact. Configure the Site URL and allow both the production and local `/account` and `/auth/reset` redirect URLs. Test confirmation and password recovery with a real inbox after SMTP and DNS verification.

Before testing profiles, apply `../migrations/20261022_foxey_auth_01_profiles.sql` to the existing Supabase project. It creates the profiles table, RLS policies, a creation trigger, and rows for already confirmed accounts.
