import { NativeSelect } from "@chakra-ui/react";

type AppSelectProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xs';
  fontSize?: string | number;
  width?: string | number;
  value?: string | number;
  placeholder?: string;
  children: React.ReactNode;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
};

export const AppSelect = ({ size, width, fontSize, value, placeholder, children, onChange, id, name, disabled, title, ...rest }: AppSelectProps) => {
  const ariaLabel = (rest["aria-label"] && String(rest["aria-label"])) || (placeholder && String(placeholder)) || "Select";
  
  return (
    <NativeSelect.Root size={size} width={width} disabled={disabled}>
      <NativeSelect.Field
        id={id}
        name={name}
        title={title}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={onChange}
        value={value}
        bg={"bg.panel"}
        fontSize={fontSize}
      >
        {/* Options should be passed as children */}
        {children}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
};