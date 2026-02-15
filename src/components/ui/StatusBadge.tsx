import { Badge } from "@chakra-ui/react";


type Status = 'active' | 'expired' | 'applied' | 'partial-applied' | 'undone' | 'partial-undone' | '?';

export function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case 'active': return <Badge colorScheme='green' bg={'yellow.100'}>Active</Badge>;
    case 'expired': return <Badge colorScheme='red' bg={'red.100'}>Expired</Badge>;
    case 'applied': return <Badge colorScheme='green' bg={'green.100'}>Applied</Badge>;
    case 'partial-applied': return <Badge colorScheme='teal' bg={'teal.100'}>Partial Applied</Badge>;
    case 'undone': return <Badge colorScheme='red' bg={'red.100'}>Undone</Badge>;
    case 'partial-undone': return <Badge colorScheme='orange' bg={'orange.100'}>Partial Undone</Badge>;
    default: return <Badge>?</Badge>;
  }
}