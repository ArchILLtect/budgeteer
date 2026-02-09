import { Box, Button, HStack, Text } from '@chakra-ui/react';
import { RouterLink } from '../components/RouterLink';

export default function Footer({ signedIn, onSignOut }: { signedIn: boolean; onSignOut?: () => void }) {
  return (
    <Box as="footer" bg={{ base: "teal.500", _dark: "teal.700" }} color="white" py={2} mt="auto">
        <HStack justify="space-around" flexWrap="wrap">
          <Text textAlign="center" color="whiteAlpha.700" fontSize="sm">
            &copy; {new Date().getFullYear()} Budgeteer. A privacy-aware personal finance app.
          </Text>
          <HStack gap={4} justify="center" flexWrap="wrap">
            <Button asChild size="sm" variant="ghost">
              <a href="https://nickhanson.me" target="_blank" rel="noreferrer">
                Showcase Site
              </a>
            </Button>

            {signedIn ? (
              <Button size="sm" variant="outline" onClick={onSignOut}>
                Sign out
              </Button>
            ) : (
              <RouterLink to="/login">
                {() => (
                  <Button as="span" size="sm" variant="outline">
                    Sign in
                  </Button>
                )}
              </RouterLink>
            )}
          </HStack>
        </HStack>
    </Box>
  );
}
