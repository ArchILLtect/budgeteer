import { Box } from "@chakra-ui/react";

export type StatusIndicatorStatus = "online" | "offline" | "checking";

type StatusIndicatorProps = {
  status: StatusIndicatorStatus;
  title?: string;
  size?: "sm" | "md" | "lg";
};

export function StatusIndicator({ status, title, size = "md" }: StatusIndicatorProps) {
  const colorToken =
    status === "online" ? "green.500" : status === "offline" ? "red.500" : "gray.400";

  const dimension = size === "sm" ? "12px" : size === "md" ? "14px" : "16px";

  const computedTitle = title ?? (status === "checking" ? "Checking…" : status);

  return (
    <Box
      as="span"
      display="inline-block"
      width={dimension}
      height={dimension}
      borderRadius="full"
      bg={colorToken}
      borderWidth="1.5px"
      borderColor={{ base: "gray.400", _dark: "gray.800" }}
      title={computedTitle}
      role="img"
      aria-label={computedTitle}
      flexShrink={0}
    />
  );
}
