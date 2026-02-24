import { NativeSelect } from "@chakra-ui/react";

type AppSelectProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xs';
  fontSize?: string | number;
  width?: string | number;
  value?: string | number;
  placeholder?: string;
  children: React.ReactNode;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

export const AppSelect = ({ size, width, fontSize, value, placeholder, children, onChange }: AppSelectProps) => {
  
  return (
    <NativeSelect.Root size={size} width={width}>
      <NativeSelect.Field placeholder={placeholder} onChange={onChange} value={value} bg={"bg.panel"} fontSize={fontSize}>
        {/* Options should be passed as children */}
        {children}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
};