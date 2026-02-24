
import { Box, Flex, Separator } from "@chakra-ui/react";
import { SidebarItem } from "../components/SidebarItem";
import { publicSidebarItems, SIDEBAR_WIDTH } from "../config/sidebar";
import { useSidebarWidthPreset } from "../store/localSettingsStore";

export type PublicSidebarProps = {
  onNavigate?: () => void;
};

export function PublicSidebar({ onNavigate }: PublicSidebarProps) {

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
      borderY={"2px solid lightgray"}
      padding={3}
      >
      <Box>
        {publicSidebarItems.map((item) => (
          <Box key={item.to}>
            <SidebarItem key={item.to} to={item.to} label={item.label} onNavigate={onNavigate} />
            <Separator my={3} />
          </Box>
        ))}
      </Box>
    </Flex>
  );
}