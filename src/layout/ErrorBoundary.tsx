import React from "react";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";

type Props = {
  children: React.ReactNode;
  title?: string;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // You can wire this to telemetry later (Sentry, LogRocket, etc.)
    console.error("ErrorBoundary caught an error:", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Box p={6}>
        <VStack align="start" gap={3} maxW="720px">
          <Heading size="md">{this.props.title ?? "Something went sideways"}</Heading>
          <Text color="gray.600">
            A UI error occurred. The rest of the app is okay — this area just crashed.
          </Text>

          {this.state.error?.message ? (
            <Box
              w="100%"
              p={3}
              borderWidth="1px"
              rounded="md"
              bg="blackAlpha.50"
              fontFamily="mono"
              fontSize="sm"
              whiteSpace="pre-wrap"
            >
              {this.state.error.message}
            </Box>
          ) : null}

          <Button onClick={this.handleReload}>Reload</Button>
        </VStack>
      </Box>
    );
  }
}
