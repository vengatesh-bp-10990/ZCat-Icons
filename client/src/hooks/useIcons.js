import { useState, useEffect, useCallback } from "react";
import { fetchIcons } from "../utils/api";

export default function useIcons() {
  const [icons, setIcons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    category_id: null,
    style: null,
  });

  const loadIcons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchIcons({ page, ...filters });
      setIcons(data.icons || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadIcons();
  }, [loadIcons]);

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  return {
    icons,
    loading,
    error,
    page,
    setPage,
    filters,
    updateFilters,
    reload: loadIcons,
  };
}
