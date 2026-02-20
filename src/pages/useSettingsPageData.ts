import { useAuthUser } from "../hooks/useAuthUser";

export function useSettingsPageData() {
  const { loading, refresh: refreshData } = useAuthUser();

  const error = null; // TODO(P1): add error handling to this hook and return the errors here

  return {
    loading,
    error,
    refreshData,
  };
}