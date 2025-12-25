import Link from "next/link";

interface ErrorPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function ErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const error = params.error || "Unknown error";

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration. Please contact support.",
    AccessDenied: "You do not have permission to sign in.",
    Callback: "There was a problem with the OAuth callback.",
    OAuthSignin: "There was a problem signing in with the OAuth provider.",
    OAuthCallback: "There was a problem with the OAuth callback.",
    OAuthCreateAccount: "Could not create user account via OAuth provider.",
    EmailCreateAccount: "Could not create user account.",
    EmailSignInError: "The email could not be sent.",
    CredentialsSignin: "Sign in failed. Check the details you provided are correct.",
    SessionCallback: "There was a problem creating your session.",
  };

  const message = errorMessages[error] || `An error occurred: ${error}`;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <h1 className="mb-2 font-bold text-xl text-red-900 dark:text-red-100">
          Authentication Error
        </h1>
        <p className="mb-6 text-red-800 dark:text-red-200">{message}</p>

        <div className="flex gap-3">
          <Link href="/auth/signin" className="btn btn-primary flex-1">
            Try Again
          </Link>
          <Link href="/" className="btn btn-secondary flex-1">
            Back Home
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
        <h2 className="mb-2 font-semibold text-sm">Debug Information</h2>
        <p className="text-gray-600 text-xs dark:text-gray-400">
          Error code: <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">{error}</code>
        </p>
        <p className="mt-2 text-gray-600 text-xs dark:text-gray-400">
          If this error persists, please check your authentication configuration and environment
          variables.
        </p>
      </div>
    </main>
  );
}
