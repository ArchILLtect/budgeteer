import { Box, Container, Text } from '@chakra-ui/react';

export default function Footer() {
  return (
    <Box as="footer" bg="gray.900" color="white" py={6} mt="auto">
      <Container maxW="6xl" px={{ base: 4, md: 8 }}>
        <Text textAlign="center" color="whiteAlpha.700" fontSize="sm">
          &copy; {new Date().getFullYear()} Budgetizer. A privacy-aware personal finance app.
        </Text>
      </Container>
    </Box>
  );
}
