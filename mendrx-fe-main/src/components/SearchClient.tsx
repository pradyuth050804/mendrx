// File: src/components/SearchClient.tsx
import React from "react";
import { useState, useCallback, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import debounce from "lodash/debounce";

interface SearchClientProps {
  onSearch: (value: string) => void;
  authToken: string;
  apiUrl: string | undefined;
  initialValue?: string;
}

export function SearchClient({
  onSearch,
  authToken,
  apiUrl,
  initialValue = "",
}: SearchClientProps) {
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchSuggestions = async (searchTerm: string) => {
    try {
      const response = await fetch(
        `${apiUrl}/reports/clients/suggest?query=${encodeURIComponent(
          searchTerm || ""
        )}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const result = await response.json();
      if (result.success) {
        setSuggestions(result.data);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    }
  };

  const debouncedFetch = useCallback(
    debounce((searchTerm: string) => fetchSuggestions(searchTerm), 300),
    [authToken, apiUrl]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (newValue.length >= 1) {
      debouncedFetch(newValue);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch("");
  };

  const handleSearchClick = () => {
    setShowSuggestions(false);
    onSearch(value.trim());
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion);
  };

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    return () => {
      debouncedFetch.cancel();
    };
  }, [debouncedFetch]);

  return (
    <div className="flex gap-2 relative">
      <div className="relative">
        <Input
          type="text"
          placeholder="Search by client name / phone number..."
          value={value}
          onChange={handleInputChange}
          onFocus={() => value.length > 0 && setShowSuggestions(true)}
          className="w-full md:w-[300px] pr-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearchClick();
            }
          }}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>
      <Button
        onClick={handleSearchClick}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Search className="mr-2 h-4 w-4" />
        Search
      </Button>
    </div>
  );
}
