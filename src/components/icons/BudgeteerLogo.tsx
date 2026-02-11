import { HStack, Text, Box } from "@chakra-ui/react";

export function BudgeteerLogo({
  size = 44,
}: {
  size?: number;
}) {
  return (
    <HStack gap={3} align="center">
      {/* Mark */}
      <Box
        w={`${size}px`}
        h={`${size}px`}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        rounded="lg"
        bg="purple.50"
        borderWidth="1px"
        borderColor="purple.200"
        color="purple.700"
      >
        <svg
          width={Math.round(size * 0.75)}
          height={Math.round(size * 0.75)}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          {/* coin */}
          <path
            d="M12 3.5C8.41 3.5 5.5 6.41 5.5 10C5.5 13.59 8.41 16.5 12 16.5C15.59 16.5 18.5 13.59 18.5 10C18.5 6.41 15.59 3.5 12 3.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* $ */}
          <path
            d="M12 6.6V6.1M12 13.9V13.4M14 8.3C13.4 7.7 12.6 7.4 11.8 7.4C10.6 7.4 9.6 8.2 9.6 9.2C9.6 10.2 10.4 10.7 12 11.1C13.6 11.5 14.4 12 14.4 13C14.4 14 13.4 14.8 12.2 14.8C11.2 14.8 10.4 14.4 9.8 13.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* small "ledger" bars */}
          <path
            d="M6.5 19.5H17.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M8 19.5V17.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 19.5V18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M16 19.5V16.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </Box>

      {/* Wordmark */}
      <Text mb={1} fontSize="5xl" fontWeight="800" letterSpacing="-0.02em">
        Budgeteer
      </Text>
    </HStack>
  );
}
