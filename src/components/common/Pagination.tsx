// src/components/common/Pagination.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react-native';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}) => {
  if (totalItems === 0) return null;

  const validTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), validTotalPages);

  const startItem = (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers array (showing max 5 page buttons around current page)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (validTotalPages <= maxVisible) {
      for (let i = 1; i <= validTotalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, safeCurrentPage - 2);
      let end = Math.min(validTotalPages, safeCurrentPage + 2);

      if (safeCurrentPage <= 3) {
        start = 1;
        end = 5;
      } else if (safeCurrentPage >= validTotalPages - 2) {
        start = validTotalPages - 4;
        end = validTotalPages;
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <View style={styles.container}>
      {/* Left info & Page size controls */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          Showing <Text style={styles.boldText}>{startItem}</Text> to{' '}
          <Text style={styles.boldText}>{endItem}</Text> of{' '}
          <Text style={styles.boldText}>{totalItems}</Text> entries
        </Text>

        {onPageSizeChange && (
          <View style={styles.pageSizeRow}>
            <Text style={styles.pageSizeLabel}>Rows per page:</Text>
            {pageSizeOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.pageSizeChip,
                  pageSize === option && styles.pageSizeChipActive,
                ]}
                onPress={() => onPageSizeChange(option)}
              >
                <Text
                  style={[
                    styles.pageSizeText,
                    pageSize === option && styles.pageSizeTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Right Page Navigation Controls */}
      <View style={styles.controlsRow}>
        {/* First Page */}
        <TouchableOpacity
          style={[styles.navBtn, safeCurrentPage <= 1 && styles.navBtnDisabled]}
          disabled={safeCurrentPage <= 1}
          onPress={() => onPageChange(1)}
        >
          <ChevronsLeft size={16} color={safeCurrentPage <= 1 ? '#cbd5e1' : '#475569'} />
        </TouchableOpacity>

        {/* Previous Page */}
        <TouchableOpacity
          style={[styles.navBtn, safeCurrentPage <= 1 && styles.navBtnDisabled]}
          disabled={safeCurrentPage <= 1}
          onPress={() => onPageChange(safeCurrentPage - 1)}
        >
          <ChevronLeft size={16} color={safeCurrentPage <= 1 ? '#cbd5e1' : '#475569'} />
        </TouchableOpacity>

        {/* Page numbers */}
        <View style={styles.pageNumbersRow}>
          {pageNumbers.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <Text key={`ellipsis-${idx}`} style={styles.ellipsis}>
                  ...
                </Text>
              );
            }
            const isActive = p === safeCurrentPage;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.pageBtn, isActive && styles.pageBtnActive]}
                onPress={() => onPageChange(p)}
              >
                <Text style={[styles.pageBtnText, isActive && styles.pageBtnTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next Page */}
        <TouchableOpacity
          style={[
            styles.navBtn,
            safeCurrentPage >= validTotalPages && styles.navBtnDisabled,
          ]}
          disabled={safeCurrentPage >= validTotalPages}
          onPress={() => onPageChange(safeCurrentPage + 1)}
        >
          <ChevronRight
            size={16}
            color={safeCurrentPage >= validTotalPages ? '#cbd5e1' : '#475569'}
          />
        </TouchableOpacity>

        {/* Last Page */}
        <TouchableOpacity
          style={[
            styles.navBtn,
            safeCurrentPage >= validTotalPages && styles.navBtnDisabled,
          ]}
          disabled={safeCurrentPage >= validTotalPages}
          onPress={() => onPageChange(validTotalPages)}
        >
          <ChevronsRight
            size={16}
            color={safeCurrentPage >= validTotalPages ? '#cbd5e1' : '#475569'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
  },
  boldText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  pageSizeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  pageSizeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  pageSizeChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  pageSizeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pageSizeTextActive: {
    color: '#ffffff',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  pageNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 4,
  },
  pageBtn: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  pageBtnTextActive: {
    color: '#ffffff',
  },
  ellipsis: {
    fontSize: 14,
    color: '#94a3b8',
    paddingHorizontal: 4,
  },
});
