import { Heading, Text, VStack } from "@chakra-ui/react";
import { useProfilePageData } from "./useProfilePageData";
import { BasicSpinner } from "../components/ui/BasicSpinner";
import { formatUsernameForDisplay } from "../services/userDisplay";
import { Tip } from "../components/ui/Tip";

type ProfilePageProps = {
  user?: { username?: string; userId?: string } | null;
};
  
export function ProfilePage({ user }: ProfilePageProps) {
  const signedIn = Boolean(user?.userId || user?.username);
  const { userUI, loading, error, userProfile, userProfileError } = useProfilePageData({
    userId: user?.userId ?? null,
    enabled: signedIn,
  });
  const showSignedIn = Boolean(userUI?.username ?? user?.username ?? user?.userId);

  const username = userUI?.username ?? user?.username;
  const email = userUI?.email;
  const role = userUI?.role;

  if (loading) return <BasicSpinner />;

  function formatAccountCreatedAt(iso?: string | null): string | null {
    if (!iso) return null;
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return null;
    return new Date(ms).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const accountCreatedLabel = formatAccountCreatedAt(userProfile?.createdAt ?? null);

  if (!showSignedIn) {
    return (
      <VStack align="start" gap={2} minH="100%" p={4} bg="bg" rounded="md" boxShadow="sm">
        <Heading size="md">Profile</Heading>
        <Text>No user is currently logged in.</Text>
      </VStack>
    );
  } else {
    return (
      <VStack align="start" gap={2} minH="100%" p={4} bg="bg" rounded="md" boxShadow="sm">
        <Heading size="2xl">Profile</Heading>
        <Tip storageKey="tip:profile-userui" title="Tip">
          Email/role come from your auth attributes and may be cached briefly. If they look stale, a refresh will
          re-fetch them.
        </Tip>
        <Text>Username: {formatUsernameForDisplay(username ?? null)}</Text>
        {email ? <Text>Email: {email}</Text> : null}
        {role ? <Text>Role: {role}</Text> : null}
        {accountCreatedLabel ? <Text>Account created: {accountCreatedLabel}</Text> : null}
        {error ? <Text color="orange.600">{error}</Text> : null}
        {userProfileError ? <Text color="orange.600">{userProfileError}</Text> : null}
      </VStack>
    );
  }
}