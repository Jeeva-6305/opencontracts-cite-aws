import React from "react";
import { useQuery } from "@apollo/client";
import { FilterTabs } from "@os-legal/ui";
import type { FilterTabItem } from "@os-legal/ui";
import {
  GET_CORPUS_CATEGORIES,
  GetCorpusCategoriesOutput,
} from "../../graphql/landing-queries";

interface CategoryFilterProps {
  selectedCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
}) => {
  const { data, loading } = useQuery<GetCorpusCategoriesOutput>(
    GET_CORPUS_CATEGORIES
  );

  // Build items array with "All" first, then categories
  const items: FilterTabItem[] = React.useMemo(() => {
    const allItem: FilterTabItem = {
      id: "all",
      label: "All",
    };

    if (!data?.corpusCategories?.edges) {
      return [allItem];
    }

    const categoryItems: FilterTabItem[] = data.corpusCategories.edges.map(
      ({ node }) => ({
        id: node.id,
        label: node.name,
        count: node.corpusCount > 0 ? node.corpusCount : undefined,
      })
    );

    return [allItem, ...categoryItems];
  }, [data]);

  const handleChange = (id: string) => {
    // Convert "all" to null for the parent component
    onCategoryChange(id === "all" ? null : id);
  };

  if (loading) {
    // Show skeleton with "All" tab while loading
    return (
      <FilterTabs
        items={[{ id: "all", label: "All" }]}
        value="all"
        onChange={() => {}}
        variant="pill"
        size="md"
      />
    );
  }

  return (
    <FilterTabs
      items={items}
      value={selectedCategory || "all"}
      onChange={handleChange}
      variant="pill"
      size="md"
    />
  );
};
