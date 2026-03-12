import { Box, Flex, Separator } from "@chakra-ui/react";
import { SidebarItem } from "../components/SidebarItem";
import { sidebarItems, SIDEBAR_WIDTH, publicSidebarItems } from "../config/sidebar";
import { useSidebarWidthPreset } from "../store/localSettingsStore";
import { useUserUI } from "../hooks/useUserUI";

export type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {

  const { userUI } = useUserUI();
  const isAdmin = userUI?.role === "Admin";
  const isTester = userUI?.role === "Tester"; // But instead of role we need some other way to determine if we should show the tester script link, so it is visible even if not logged in and it set via clicking a link in an email. We could do this via a query param that we set when linking to the tester script in the email, and then persist that in local storage so it "sticks" after auth resolves. We would also want to make sure that the tester script page itself also checks for that persisted flag so it doesn't look broken if you navigate there directly without the query param.

  const sidebarWidthPreset = useSidebarWidthPreset();
  const CURRENT_SIDEBAR_WIDTH = SIDEBAR_WIDTH[sidebarWidthPreset] ?? SIDEBAR_WIDTH.small;

  return (
    <Flex
      flexDirection={"column"}
      justifyContent={"space-between"}
      w={CURRENT_SIDEBAR_WIDTH}
      borderRightWidth="1px"
      bg={{ base: "teal.300", _dark: "teal.700" }}
      boxShadow="sm"
      position={"sticky"}
      minH="100%"
      zIndex="1000"
      shadow="md"
      borderY={"1px solid"}
      borderColor={{ base: "teal.400", _dark: "teal.600" }}
      padding={3}
      >
      <Box>
        {sidebarItems.map((item) => (
          <Box key={item.to}>
            <SidebarItem key={item.to} to={item.to} label={item.label} onNavigate={onNavigate} />
            <Separator my={3} />
          </Box>
        ))}
      </Box>
      <Box>
        {import.meta.env.DEV || isAdmin ? (
          <Separator my={3} />
        ) : null}
        {import.meta.env.DEV ? (
          <>
              <SidebarItem to="/dev" label="Dev" onNavigate={onNavigate} />
          </>
        ) : null}
        {import.meta.env.DEV && isAdmin ? (
          <Separator my={3} />
        ) : null}
        {isAdmin ? (
          <>
            <SidebarItem to="/admin" label="Admin" onNavigate={onNavigate} />
          </>
        ) : null}
        {import.meta.env.DEV || isAdmin ? (
          <Separator my={3} />
        ) : null}
      </Box>
      <Box>
        {import.meta.env.DEV || isTester ? (
          <>
            <SidebarItem to="/tester-script" label="Tester Script" onNavigate={onNavigate} />
          </>
        ) : null}
      </Box>
      <Box mt={4}>
        {publicSidebarItems.map((item) => (
          <Box key={item.to}>
            <Separator my={3} />
            <SidebarItem key={item.to} to={item.to} label={item.label} onNavigate={onNavigate} />
          </Box>
        ))}
      </Box>
    </Flex>
  );
}