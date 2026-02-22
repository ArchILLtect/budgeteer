import { Box, Flex, Separator } from "@chakra-ui/react";
import { SidebarItem } from "../components/SidebarItem";
import { sidebarItems, SIDEBAR_WIDTH, publicSidebarItems } from "../config/sidebar";
import { useSidebarWidthPreset } from "../store/localSettingsStore";
import { useUserUI } from "../hooks/useUserUI";

export function Sidebar() {

  const { userUI } = useUserUI();
  const isAdmin = userUI?.role === "Admin";

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
            <SidebarItem key={item.to} to={item.to} label={item.label} />
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
              <SidebarItem to="/dev" label="Dev" />
          </>
        ) : null}
        {import.meta.env.DEV && isAdmin ? (
          <Separator my={3} />
        ) : null}
        {isAdmin ? (
          <>
            <SidebarItem to="/admin" label="Admin" />
          </>
        ) : null}
        {import.meta.env.DEV || isAdmin ? (
          <Separator my={3} />
        ) : null}
      </Box>
      <Box mt={4}>
        {publicSidebarItems.map((item) => (
          <Box key={item.to}>
            <Separator my={3} />
            <SidebarItem key={item.to} to={item.to} label={item.label} />
          </Box>
        ))}
      </Box>
    </Flex>
  );
}