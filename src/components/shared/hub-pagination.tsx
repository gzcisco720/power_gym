'use client';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface HubPaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function HubPagination({ currentPage, totalPages, basePath }: HubPaginationProps) {
  if (totalPages <= 1) return null;

  const href = (page: number) => `${basePath}?page=${page}`;

  const pages = buildPageList(currentPage, totalPages);

  return (
    <div className="mt-4 flex justify-center">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={currentPage > 1 ? href(currentPage - 1) : '#'}
              aria-disabled={currentPage <= 1}
              className={currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}
            />
          </PaginationItem>
          {pages.map((p, i) => {
            return p === 'ellipsis' ? (
              // oxlint-disable-next-line react-doctor/no-array-index-key, react-doctor/no-array-index-as-key
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink href={href(p)} isActive={p === currentPage}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext
              href={currentPage < totalPages ? href(currentPage + 1) : '#'}
              aria-disabled={currentPage >= totalPages}
              className={currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}
