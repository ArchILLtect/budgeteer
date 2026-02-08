import { Box, Container, Flex, HStack, Heading, Link } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

const navLinks = [
  { label: 'Planner', to: '/planner' },
  { label: 'Accounts', to: '/accounts' },
  { label: 'Tracker', to: '/tracker' },
  { label: 'Imports', to: '/imports' },
  { label: 'Settings', to: '/settings' },
];

export default function Navigation() {
  return (
    <Box as="nav" bg="gray.900" color="white" boxShadow="sm" py={4}>
      <Container maxW="6xl" px={{ base: 4, md: 8 }}>
        <Flex align="center" justify="space-between" gap={6} flexWrap="wrap">
          <Heading size="md" letterSpacing="tight">
            Budgetizer
          </Heading>
          <HStack as="ul" listStyleType="none" gap={{ base: 4, md: 6 }} m={0} p={0}>
            {navLinks.map((link) => (
              <Box as="li" key={link.to}>
                <Link
                  asChild
                  fontWeight="medium"
                  color="whiteAlpha.900"
                  _hover={{ color: 'green.300' }}
                >
                  <RouterLink to={link.to}>{link.label}</RouterLink>
                </Link>
              </Box>
            ))}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
