import { Box, Container, Flex, HStack, Heading } from '@chakra-ui/react';
import { RouterLink } from "../components/RouterLink";

const navLinks = [
  { label: 'Planner', to: '/planner' },
  { label: 'Accounts', to: '/accounts' },
  { label: 'Tracker', to: '/tracker' },
  { label: 'Imports', to: '/imports' },
  { label: 'Login', to: '/login' },
  { label: 'Settings', to: '/settings' },
];

export default function Navigation() {
  return (
    <Box
      position="sticky"
      top="0"
      zIndex="1000"
      bg={{ base: "teal.500", _dark: "teal.700" }}
      color="white"
      boxShadow="sm"
      px={4}
      py={3}
      shadow="md"
    >
      <Container maxW="6xl" px={{ base: 4, md: 8 }}>
        <Flex align="center" justify="space-between" gap={6} flexWrap="wrap">
          <RouterLink to={"/homepage"}>
          {({ isActive }) => (
              <Box
                  px={3}
                  py={2}
                  rounded="md"
                  fontWeight={isActive ? "700" : "500"}
                  bg={isActive ? "teal.700" : "teal.500"}
                  _hover={isActive ? { bg: "teal.700" } : { bg: "teal.600", color: "white" }}
              >
                <Heading size="lg" color="white">Budgeteer</Heading>
              </Box>
          )}
          </RouterLink>
          <HStack as="ul" listStyleType="none" gap={{ base: 4, md: 6 }} m={0} p={0}>
            {navLinks.map((link) => (
              <Box as="nav" key={link.to}>
                <RouterLink to={link.to}>
                {({ isActive }) => (
                    <Box
                        px={3}
                        py={2}
                        rounded="md"
                        fontWeight={isActive ? "700" : "500"}
                        bg={isActive ? "teal.700" : "teal.500"}
                        _hover={isActive ? { bg: "teal.700" } : { bg: "teal.600", color: "white" }}
                    >
                        {link.label}
                    </Box>
                )}
                </RouterLink>
              </Box>
            ))}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
