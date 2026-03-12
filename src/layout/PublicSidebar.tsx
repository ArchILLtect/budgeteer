
import { Box, Flex, Separator } from "@chakra-ui/react";
import { SidebarItem } from "../components/SidebarItem";
import { publicSidebarItems, SIDEBAR_WIDTH } from "../config/sidebar";
import { useSidebarWidthPreset } from "../store/localSettingsStore";
import { useTesterModeEnabled } from "../hooks/useTesterMode";

export type PublicSidebarProps = {
  onNavigate?: () => void;
};

export function PublicSidebar({ onNavigate }: PublicSidebarProps) {

  const sidebarWidthPreset = useSidebarWidthPreset();
  const CURRENT_SIDEBAR_WIDTH = SIDEBAR_WIDTH[sidebarWidthPreset] ?? SIDEBAR_WIDTH.small;
  const testerModeEnabled = useTesterModeEnabled();
  
  return (
    <Flex
      flexDirection={"column"}
      justifyContent={"space-between"}
      w={CURRENT_SIDEBAR_WIDTH}
      borderRightWidth="1px"
      bg={{ base: "teal.300", _dark: "teal.700" }}
      boxShadow="sm"
      position={"sticky"}
      height="100%"
      zIndex="1000"
      shadow="md"
      borderY={"2px solid lightgray"}
      padding={3}
    >
      <Box height={"100%"}>
        {publicSidebarItems.map((item) => (
          <Box key={item.to}>
            <SidebarItem key={item.to} to={item.to} label={item.label} onNavigate={onNavigate} />
            <Separator my={3} />
          </Box>
        ))}
        {import.meta.env.DEV || testerModeEnabled ? (
          <Box h="50%" display="flex" flexDirection="column" textAlign="center" justifyContent="center">
            <Box key="/tester-script">
              <Separator my={3} />
              <SidebarItem to="/tester-script" label="Tester Script" onNavigate={onNavigate} />
              <Separator my={3} />
            </Box>
          </Box>
        ) : null}
      </Box>
    </Flex>
  );
}