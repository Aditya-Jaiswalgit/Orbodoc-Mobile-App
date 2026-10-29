import { colors, radii, spacing, typography } from '../../theme/tokens';
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
  itemLabel?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  itemLabel = 'entries',
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
          <Text style={styles.boldText}>{totalItems}</Text> {itemLabel}
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
          <ChevronsLeft size={16} color={safeCurrentPage <= 1 ? colors.input : colors.muted} />
        </TouchableOpacity>

        {/* Previous Page */}
        <TouchableOpacity
          style={[styles.navBtn, safeCurrentPage <= 1 && styles.navBtnDisabled]}
          disabled={safeCurrentPage <= 1}
          onPress={() => onPageChange(safeCurrentPage - 1)}
        >
          <ChevronLeft size={16} color={safeCurrentPage <= 1 ? colors.input : colors.muted} />
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
            color={safeCurrentPage >= validTotalPages ? colors.input : colors.muted}
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
            color={safeCurrentPage >= validTotalPages ? colors.input : colors.muted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  infoText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    color: colors.muted,
  },
  boldText: {
    fontWeight: typography.weight.bold,
    color: colors.text,
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.tiny,
    marginLeft: spacing.sm,
  },
  pageSizeLabel: {
    fontFamily: typography.family, fontSize: typography.size.sm,
    color: colors.muted,
    fontWeight: typography.weight.medium,
  },
  pageSizeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.background,
  },
  pageSizeChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  pageSizeText: {
    fontFamily: typography.family, fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.muted,
  },
  pageSizeTextActive: {
    color: colors.surface,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    backgroundColor: colors.secondary,
    borderColor: colors.border,
  },
  pageNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  pageBtn: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: spacing.tiny,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  pageBtnText: {
    fontFamily: typography.family, fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    color: colors.foreground,
  },
  pageBtnTextActive: {
    color: colors.surface,
  },
  ellipsis: {
    fontFamily: typography.family, fontSize: typography.size.body,
    color: colors.subtle,
    paddingHorizontal: spacing.xs,
  },
});
