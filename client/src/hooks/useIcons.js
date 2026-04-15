import { useState, useEffect, useCallback } from "react";
import { fetchIcons } from "../utils/api";

const PAGE_SIZE = 50;

export default function useIcons() {
  const [icons, setIcons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    category_id: null,
    style: null,
  });

  const loadIcons = useCallback(async (pageNum = 1, append = false) => {
    if (!append) setLoading(true);
    setError(null);
    try {
      const data = await fetchIcons({ page: pageNum, limit: PAGE_SIZE, ...filters });
      const newIcons = data.icons || [];
      setIcons((prev) => append ? [...prev, ...newIcons] : newIcons);
      setHasMore(newIcons.length >= PAGE_SIZE);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadIcons(1, false);
  }, [loadIcons]);

  const loadMore = () => {
    if (hasMore) loadIcons(page + 1, true);
  };

  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  return {
    icons,
    loading,
    error,
    page,
    hasMore,
    loadMore,
    filters,
    updateFilters,
    reload: () => loadIcons(1, false),
  };
}
